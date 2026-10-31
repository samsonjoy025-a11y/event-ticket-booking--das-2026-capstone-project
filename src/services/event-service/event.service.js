import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/error-codes.js';
import { createSecureId } from '../../shared/security/secure-id.js';
import { assertIdentifier } from '../../shared/validation/validate.js';
import { MAX_ID_GENERATION_ATTEMPTS } from '../../shared/config/constants.js';
import { validateCreateEventInput } from './event.validation.js';

function makeUniqueId(records, idGenerator, prefix) {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const id = assertIdentifier(idGenerator(prefix), 'generated identifier');
    if (!records.has(id)) return id;
  }

  throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Unable to allocate a unique identifier.');
}

function copyEvent(event) {
  return { ...event, ticketTierIds: [...event.ticketTierIds] };
}

export function createEventService({ idGenerator = createSecureId, clock = () => new Date() } = {}) {
  const events = new Map();

  function getStoredEvent(eventId) {
    const id = assertIdentifier(eventId, 'eventId');
    const event = events.get(id);
    if (!event) throw new AppError(ERROR_CODES.NOT_FOUND, 'Event was not found.');
    return event;
  }

  return Object.freeze({
    createEvent(input) {
      const eventInput = validateCreateEventInput(input);
      const eventId = makeUniqueId(events, idGenerator, 'event');
      const createdAt = new Date(clock()).toISOString();
      const event = {
        id: eventId,
        ...eventInput,
        status: 'draft',
        ticketTierIds: [],
        createdAt,
      };
      events.set(eventId, event);
      return copyEvent(event);
    },

    publishEvent(eventId) {
      const event = getStoredEvent(eventId);
      if (event.status !== 'draft') {
        throw new AppError(ERROR_CODES.INVALID_STATE, 'Only draft events can be published.');
      }

      const published = { ...event, status: 'published' };
      events.set(event.id, published);
      return copyEvent(published);
    },

    getEvent(eventId) {
      return copyEvent(getStoredEvent(eventId));
    },

    associateTicketTier(eventId, ticketTierId) {
      const event = getStoredEvent(eventId);
      const tierId = assertIdentifier(ticketTierId, 'ticketTierId');
      if (event.ticketTierIds.includes(tierId)) {
        throw new AppError(ERROR_CODES.CONFLICT, 'Ticket tier is already associated with this event.');
      }

      const updated = { ...event, ticketTierIds: [...event.ticketTierIds, tierId] };
      events.set(event.id, updated);
      return copyEvent(updated);
    },
  });
}