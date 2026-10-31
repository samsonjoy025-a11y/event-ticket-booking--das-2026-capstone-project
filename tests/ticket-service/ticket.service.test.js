import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventService } from '../../src/services/event-service/index.js';
import { createTicketService } from '../../src/services/ticket-service/index.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

function createEventAndTicketServices() {
  const events = createEventService();
  const event = events.createEvent({
    title: 'City Sounds', city: 'Lagos', venue: 'Civic Hall', eventDate: '2030-05-10T18:00:00Z',
  });
  return { events, event, tickets: createTicketService({ events }) };
}

test('creates ticket tiers associated with an event and tracks available inventory', () => {
  const { event, events, tickets } = createEventAndTicketServices();
  const tier = tickets.createTicketTier({
    eventId: event.id, name: 'General', priceMinor: 2500, currency: 'USD', capacity: 3,
  });

  assert.equal(tier.availableQuantity, 3);
  assert.deepEqual(events.getEvent(event.id).ticketTierIds, [tier.id]);
  assert.equal(tickets.reserveInventory(tier.id, 2).availableQuantity, 1);
  assert.equal(tickets.releaseInventory(tier.id, 1).availableQuantity, 2);
});

test('rejects invalid price and capacity without changing event associations', () => {
  const { event, events, tickets } = createEventAndTicketServices();
  const invalidTiers = [
    { eventId: event.id, name: 'General', priceMinor: -1, currency: 'USD', capacity: 3 },
    { eventId: event.id, name: 'General', priceMinor: 100, currency: 'USD', capacity: 0 },
    { eventId: event.id, name: 'General', priceMinor: 100, currency: 'USD', capacity: 1.5 },
    { eventId: event.id, name: 'General', priceMinor: 1.5, currency: 'USD', capacity: 3 },
  ];

  for (const invalidTier of invalidTiers) {
    assert.throws(() => tickets.createTicketTier(invalidTier), (error) => error.code === ERROR_CODES.VALIDATION);
  }
  assert.deepEqual(events.getEvent(event.id).ticketTierIds, []);
});

test('rejected reservation and invalid release preserve capacity bounds', () => {
  const { event, tickets } = createEventAndTicketServices();
  const tier = tickets.createTicketTier({
    eventId: event.id, name: 'Limited', priceMinor: 0, currency: 'USD', capacity: 2,
  });

  tickets.reserveInventory(tier.id, 2);
  assert.throws(() => tickets.reserveInventory(tier.id, 1), (error) => error.code === ERROR_CODES.SOLD_OUT);
  assert.equal(tickets.getAvailableQuantity(tier.id), 0);
  assert.throws(() => tickets.releaseInventory(tier.id, 3), (error) => error.code === ERROR_CODES.INVALID_STATE);
  assert.equal(tickets.getAvailableQuantity(tier.id), 0);
});

test('batch tier reads group current snapshots by event and include events with no tiers', () => {
  const { event, tickets } = createEventAndTicketServices();
  const secondEvent = 'event_second';
  const firstTier = tickets.createTicketTier({
    eventId: event.id, name: 'General', priceMinor: 2500, currency: 'USD', capacity: 4,
  });
  const secondTier = tickets.createTicketTier({
    eventId: event.id, name: 'Balcony', priceMinor: 5000, currency: 'USD', capacity: 2,
  });
  tickets.reserveInventory(firstTier.id, 3);

  const result = tickets.getTicketTiersForEvents([event.id, secondEvent]);
  assert.deepEqual(result.map((group) => group.eventId), [event.id, secondEvent]);
  assert.deepEqual(result[0].ticketTiers.map((tier) => tier.name), ['General', 'Balcony']);
  assert.deepEqual(result[0].ticketTiers.map((tier) => tier.availableQuantity), [1, 2]);
  assert.deepEqual(result[1].ticketTiers, []);
  assert.equal(Object.hasOwn(result[0].ticketTiers[0], 'reservedQuantity'), false);
});

test('batch tier reads reject malformed and duplicate event identifiers', () => {
  const { tickets } = createEventAndTicketServices();
  assert.throws(() => tickets.getTicketTiersForEvents('event_1'), (error) => error.code === ERROR_CODES.VALIDATION);
  assert.throws(() => tickets.getTicketTiersForEvents(['event_one', 'event_one']),
    (error) => error.code === ERROR_CODES.VALIDATION);
});