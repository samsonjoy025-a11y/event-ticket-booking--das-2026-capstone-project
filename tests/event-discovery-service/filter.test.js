import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/bootstrap.js';

function addEvent(app, { title, city = 'Lagos', eventDate, tiers = [], publish = true }) {
  const event = app.events.createEvent({ title, city, venue: `${title} Hall`, eventDate });
  for (const tier of tiers) {
    const created = app.tickets.createTicketTier({ eventId: event.id, ...tier });
    if (tier.reservedQuantity) app.tickets.reserveInventory(created.id, tier.reservedQuantity);
  }
  if (publish) app.events.publishEvent(event.id);
  return app.events.getEvent(event.id);
}

test('city matching is case-insensitive, trimmed, and exact', () => {
  const app = createApplication();
  addEvent(app, { title: 'Lagos One', city: 'Lagos', eventDate: '2030-05-01T00:00:00Z' });
  addEvent(app, { title: 'Lagos Coast', city: 'Greater Lagos', eventDate: '2030-05-01T00:00:00Z' });

  assert.deepEqual(app.discovery.discoverEvents({ city: '  lAgOs ' }).map((event) => event.title), ['Lagos One']);
});

test('date bounds include UTC date-only days and exact timestamp boundaries', () => {
  const app = createApplication();
  addEvent(app, { title: 'At Start', eventDate: '2030-05-01T00:00:00.000Z' });
  addEvent(app, { title: 'On End Day', eventDate: '2030-05-03T23:59:59.999Z' });
  addEvent(app, { title: 'After End', eventDate: '2030-05-04T00:00:00.000Z' });

  assert.deepEqual(app.discovery.discoverEvents({
    startDate: '2030-05-01', endDate: '2030-05-03',
  }).map((event) => event.title), ['At Start', 'On End Day']);
  assert.deepEqual(app.discovery.discoverEvents({
    startDate: '2030-05-01T00:00:00Z', endDate: '2030-05-01T00:00:00Z',
  }).map((event) => event.title), ['At Start']);
});

test('price filters use the lowest available tier in the requested currency with inclusive bounds', () => {
  const app = createApplication();
  const event = addEvent(app, {
    title: 'Many Tiers', eventDate: '2030-05-01T00:00:00Z', tiers: [
      { name: 'Sold out cheap', priceMinor: 100, currency: 'USD', capacity: 1, reservedQuantity: 1 },
      { name: 'Available USD', priceMinor: 7500, currency: 'USD', capacity: 2 },
      { name: 'Available EUR', priceMinor: 1, currency: 'EUR', capacity: 2 },
    ],
  });
  addEvent(app, {
    title: 'Euro Only', eventDate: '2030-05-01T00:00:00Z',
    tiers: [{ name: 'Euro', priceMinor: 500, currency: 'EUR', capacity: 1 }],
  });

  const results = app.discovery.discoverEvents({ minPriceMinor: 7500, maxPriceMinor: 7500, currency: 'USD' });
  assert.deepEqual(results.map((result) => result.id), [event.id]);
  assert.equal(results[0].discovery.minimumAvailablePriceMinor, 7500);
  assert.equal(results[0].discovery.availableQuantity, 4);
});

test('availability filtering uses summed current inventory and omits sold-out and tierless events', () => {
  const app = createApplication();
  const available = addEvent(app, {
    title: 'Available', eventDate: '2030-05-01T00:00:00Z', tiers: [
      { name: 'A', priceMinor: 1, currency: 'USD', capacity: 4, reservedQuantity: 2 },
      { name: 'B', priceMinor: 1, currency: 'EUR', capacity: 3 },
    ],
  });
  addEvent(app, {
    title: 'Sold Out', eventDate: '2030-05-01T00:00:00Z',
    tiers: [{ name: 'Full', priceMinor: 1, currency: 'USD', capacity: 1, reservedQuantity: 1 }],
  });
  addEvent(app, { title: 'No Tiers', eventDate: '2030-05-01T00:00:00Z' });

  const result = app.discovery.discoverEvents({ availableOnly: true });
  assert.deepEqual(result.map((event) => event.id), [available.id]);
  assert.equal(result[0].discovery.availableQuantity, 5);
});

test('combined search, city, date, currency-safe price, and availability filters compose', () => {
  const app = createApplication();
  const match = addEvent(app, {
    title: 'Technology Forum', city: 'Lagos', eventDate: '2030-05-10T12:00:00Z',
    tiers: [{ name: 'General', priceMinor: 5000, currency: 'NGN', capacity: 10 }],
  });
  addEvent(app, {
    title: 'Technology Forum Abroad', city: 'London', eventDate: '2030-05-10T12:00:00Z',
    tiers: [{ name: 'General', priceMinor: 5000, currency: 'NGN', capacity: 10 }],
  });
  addEvent(app, {
    title: 'Technology Forum Too Expensive', city: 'Lagos', eventDate: '2030-05-10T12:00:00Z',
    tiers: [{ name: 'General', priceMinor: 50001, currency: 'NGN', capacity: 10 }],
  });

  const result = app.discovery.discoverEvents({
    query: 'technology', city: 'LAGOS', startDate: '2030-05-10', endDate: '2030-05-10',
    minPriceMinor: 5000, maxPriceMinor: 50000, currency: 'NGN', availableOnly: true,
  });
  assert.deepEqual(result.map((event) => event.id), [match.id]);
});