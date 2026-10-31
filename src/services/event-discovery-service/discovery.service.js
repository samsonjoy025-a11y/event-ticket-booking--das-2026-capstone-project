import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/error-codes.js';
import {
  assertCurrencyCode,
  assertNonNegativeInteger,
  assertIdentifier,
  assertPositiveInteger,
} from '../../shared/validation/validate.js';
import { filterEvents } from './filter.service.js';
import { searchEvents } from './search.service.js';
import { sortEvents } from './sort.service.js';
import { validateDiscoveryOptions } from './discovery.validation.js';

function dependencyError() {
  return new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, 'A required discovery dependency is unavailable.');
}

function readPublishedEvents(eventsService) {
  try {
    const events = eventsService.listPublishedEvents();
    if (!Array.isArray(events)) throw dependencyError();
    const seenEventIds = new Set();
    return events.filter((event) => event && event.status === 'published').map((event) => {
      assertIdentifier(event.id, 'eventId');
      if (typeof event.title !== 'string'
        || typeof event.city !== 'string' || typeof event.venue !== 'string'
        || typeof event.eventDate !== 'string'
        || !/(?:Z|[+-]\d{2}:\d{2})$/.test(event.eventDate)
        || !Number.isFinite(Date.parse(event.eventDate))
        || !Array.isArray(event.ticketTierIds) || seenEventIds.has(event.id)) throw dependencyError();
      seenEventIds.add(event.id);
      return {
        id: event.id,
        title: event.title,
        city: event.city,
        venue: event.venue,
        eventDate: event.eventDate,
        status: event.status,
        ticketTierIds: [...event.ticketTierIds],
        ...(typeof event.createdAt === 'string' ? { createdAt: event.createdAt } : {}),
      };
    });
  } catch {
    throw dependencyError();
  }
}

function readTicketGroups(ticketsService, events, requestedCurrency) {
  const eventIds = events.map((event) => event.id);
  let groups;
  try {
    groups = ticketsService.getTicketTiersForEvents(eventIds);
  } catch {
    throw dependencyError();
  }

  if (!Array.isArray(groups) || groups.length !== events.length) throw dependencyError();
  const groupsByEventId = new Map();
  for (const group of groups) {
    if (!group || typeof group.eventId !== 'string' || !Array.isArray(group.ticketTiers)
      || groupsByEventId.has(group.eventId)) throw dependencyError();
    groupsByEventId.set(group.eventId, group.ticketTiers);
  }

  const discoveryByEventId = new Map();
  for (const event of events) {
    const tiers = groupsByEventId.get(event.id);
    if (!tiers) throw dependencyError();

    const associatedIds = new Set(event.ticketTierIds.map((id) => assertIdentifier(id, 'ticketTierId')));
    if (associatedIds.size !== event.ticketTierIds.length) throw dependencyError();
    const returnedIds = new Set();
    let availableQuantity = 0;
    let minimumAvailablePriceMinor = null;

    for (const tier of tiers) {
      if (!tier || typeof tier.id !== 'string' || tier.eventId !== event.id
        || returnedIds.has(tier.id) || !associatedIds.has(tier.id)) throw dependencyError();
      returnedIds.add(tier.id);

      const capacity = assertPositiveInteger(tier.capacity, 'capacity');
      const available = assertNonNegativeInteger(tier.availableQuantity, 'availableQuantity');
      const price = assertNonNegativeInteger(tier.priceMinor, 'priceMinor');
      const currency = assertCurrencyCode(tier.currency);
      if (available > capacity) throw dependencyError();
      availableQuantity += available;
      if (!Number.isSafeInteger(availableQuantity)) throw dependencyError();

      if (available > 0 && currency === requestedCurrency
        && (minimumAvailablePriceMinor === null || price < minimumAvailablePriceMinor)) {
        minimumAvailablePriceMinor = price;
      }
    }

    if (returnedIds.size !== associatedIds.size) throw dependencyError();
    discoveryByEventId.set(event.id, { availableQuantity, minimumAvailablePriceMinor });
  }

  return discoveryByEventId;
}

function enrichEvents(events, discoveryByEventId, currency) {
  return events.map((event) => {
    if (!discoveryByEventId.has(event.id)) {
      return { ...event, ticketTierIds: [...event.ticketTierIds] };
    }

    const { availableQuantity, minimumAvailablePriceMinor } = discoveryByEventId.get(event.id);
    const price = currency === undefined
      ? undefined
      : event.ticketTierIds.length === 0
        ? null
        : minimumAvailablePriceMinor;
    return {
      ...event,
      ticketTierIds: [...event.ticketTierIds],
      ...(discoveryByEventId.has(event.id) ? {
        discovery: {
          availableQuantity,
          ...(currency === undefined ? {} : { currency, minimumAvailablePriceMinor: price }),
        },
      } : {}),
    };
  });
}

export function createEventDiscoveryService({ events, tickets } = {}) {
  if (!events || typeof events.listPublishedEvents !== 'function') {
    throw new TypeError('Discovery service requires the event service public interface.');
  }
  if (tickets !== undefined && (!tickets || typeof tickets.getTicketTiersForEvents !== 'function')) {
    throw new TypeError('Discovery service requires the ticket service batch read interface.');
  }

  return Object.freeze({
    discoverEvents(input = {}) {
      const options = validateDiscoveryOptions(input);
      const publishedEvents = readPublishedEvents(events);
      const candidates = filterEvents(searchEvents(publishedEvents, options.normalizedQuery), {
        ...options,
        requiresTicketData: false,
      });

      let discoveryByEventId = new Map();
      if (options.requiresTicketData && candidates.length > 0) {
        if (!tickets) throw dependencyError();
        try {
          discoveryByEventId = readTicketGroups(tickets, candidates, options.currency);
        } catch {
          throw dependencyError();
        }
      }

      const enriched = enrichEvents(candidates, discoveryByEventId, options.currency);
      const filtered = filterEvents(enriched, options);
      return sortEvents(filtered, options).map((event) => ({
        ...event,
        ticketTierIds: [...event.ticketTierIds],
        ...(event.discovery ? { discovery: { ...event.discovery } } : {}),
      }));
    },
  });
}