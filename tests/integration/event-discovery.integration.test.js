import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/bootstrap.js';
import { createEventDiscoveryService } from '../../src/services/event-discovery-service/index.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

function createPublishedEvent(app, title) {
  const event = app.events.createEvent({
    title, city: 'Lagos', venue: 'Civic Hall', eventDate: '2030-05-10T18:00:00Z',
  });
  app.events.publishEvent(event.id);
  return event;
}

test('application discovery uses the public event and ticket interfaces and batches tier reads once', () => {
  const app = createApplication();
  const first = createPublishedEvent(app, 'First');
  const second = createPublishedEvent(app, 'Second');
  const firstTier = app.tickets.createTicketTier({
    eventId: first.id, name: 'General', priceMinor: 300, currency: 'GBP', capacity: 4,
  });
  app.tickets.createTicketTier({
    eventId: second.id, name: 'General', priceMinor: 100, currency: 'GBP', capacity: 2,
  });
  app.tickets.reserveInventory(firstTier.id, 3);

  let batchReadCount = 0;
  const discovery = createEventDiscoveryService({
    events: app.events,
    tickets: {
      getTicketTiersForEvents(eventIds) {
        batchReadCount += 1;
        return app.tickets.getTicketTiersForEvents(eventIds);
      },
    },
  });
  const results = discovery.discoverEvents({ sortBy: 'availability' });
  assert.deepEqual(results.map((event) => event.id), [second.id, first.id]);
  assert.equal(results.find((event) => event.id === first.id).discovery.availableQuantity, 1);
  assert.equal(batchReadCount, 1);
});

test('event-only search works without Ticket Service and excludes unpublished results', () => {
  const app = createApplication();
  const published = createPublishedEvent(app, 'Published Match');
  app.events.createEvent({
    title: 'Draft Match', city: 'Lagos', venue: 'Civic Hall', eventDate: '2030-05-10T18:00:00Z',
  });
  const discovery = createEventDiscoveryService({ events: app.events });

  assert.deepEqual(discovery.discoverEvents({ query: 'match' }).map((event) => event.id), [published.id]);
  assert.throws(() => discovery.discoverEvents({ availableOnly: true }),
    (error) => error.code === ERROR_CODES.DEPENDENCY_UNAVAILABLE);
});

test('discovery defensively excludes draft records returned by a faulty event dependency', () => {
  const app = createApplication();
  const published = createPublishedEvent(app, 'Visible');
  const draft = app.events.createEvent({
    title: 'Hidden', city: 'Lagos', venue: 'Civic Hall', eventDate: '2030-05-10T18:00:00Z',
  });
  const discovery = createEventDiscoveryService({
    events: { listPublishedEvents: () => [app.events.getEvent(published.id), app.events.getEvent(draft.id)] },
  });

  assert.deepEqual(discovery.discoverEvents({}).map((event) => event.id), [published.id]);
});

test('required service failures return a sanitized dependency error and no partial results', () => {
  const app = createApplication();
  createPublishedEvent(app, 'Potential Result');
  const failedEvents = createEventDiscoveryService({
    events: { listPublishedEvents() { throw new Error('private service detail'); } },
    tickets: app.tickets,
  });
  assert.throws(() => failedEvents.discoverEvents({}), (error) => {
    assert.equal(error.code, ERROR_CODES.DEPENDENCY_UNAVAILABLE);
    assert.equal(error.message, 'A required discovery dependency is unavailable.');
    return true;
  });

  const failedTickets = createEventDiscoveryService({
    events: app.events,
    tickets: { getTicketTiersForEvents() { throw new Error('private ticket detail'); } },
  });
  assert.throws(() => failedTickets.discoverEvents({ sortBy: 'availability' }),
    (error) => error.code === ERROR_CODES.DEPENDENCY_UNAVAILABLE);
});

test('inconsistent ticket batch data is rejected instead of inventing prices or availability', () => {
  const app = createApplication();
  const event = createPublishedEvent(app, 'One Event');
  app.tickets.createTicketTier({
    eventId: event.id, name: 'General', priceMinor: 300, currency: 'USD', capacity: 2,
  });
  const discovery = createEventDiscoveryService({
    events: app.events,
    tickets: { getTicketTiersForEvents: () => [{ eventId: event.id, ticketTiers: [] }] },
  });

  assert.throws(() => discovery.discoverEvents({ minPriceMinor: 1, currency: 'USD' }),
    (error) => error.code === ERROR_CODES.DEPENDENCY_UNAVAILABLE);
});

test('malformed provider timestamps and capacities become controlled dependency errors', () => {
  const app = createApplication();
  const event = createPublishedEvent(app, 'Timestamped');
  const localTimeEvent = {
    ...app.events.getEvent(event.id),
    eventDate: '2030-05-10T18:00:00',
  };
  const badEvents = createEventDiscoveryService({
    events: { listPublishedEvents: () => [localTimeEvent] },
  });
  assert.throws(() => badEvents.discoverEvents({}),
    (error) => error.code === ERROR_CODES.DEPENDENCY_UNAVAILABLE);

  const tier = app.tickets.createTicketTier({
    eventId: event.id, name: 'General', priceMinor: 100, currency: 'USD', capacity: 1,
  });
  const badTickets = createEventDiscoveryService({
    events: app.events,
    tickets: {
      getTicketTiersForEvents: () => [{
        eventId: event.id,
        ticketTiers: [{
          id: tier.id, eventId: event.id, priceMinor: 100, currency: 'USD',
          capacity: 0, availableQuantity: 0,
        }],
      }],
    },
  });
  assert.throws(() => badTickets.discoverEvents({ availableOnly: true }),
    (error) => error.code === ERROR_CODES.DEPENDENCY_UNAVAILABLE);
});