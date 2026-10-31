import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/bootstrap.js';

function addEvent(app, { title, eventDate, tiers = [] }) {
  const event = app.events.createEvent({ title, city: 'Lagos', venue: `${title} Hall`, eventDate });
  for (const tier of tiers) app.tickets.createTicketTier({ eventId: event.id, ...tier });
  app.events.publishEvent(event.id);
  return app.events.getEvent(event.id);
}

test('date sorting supports both directions and keeps equal dates stable', () => {
  const app = createApplication();
  addEvent(app, { title: 'First Equal', eventDate: '2030-05-02T00:00:00Z' });
  addEvent(app, { title: 'Earlier', eventDate: '2030-05-01T00:00:00Z' });
  addEvent(app, { title: 'Second Equal', eventDate: '2030-05-02T00:00:00Z' });
  const original = app.events.listPublishedEvents().map((event) => event.title);

  assert.deepEqual(app.discovery.discoverEvents({ sortBy: 'date' }).map((event) => event.title),
    ['Earlier', 'First Equal', 'Second Equal']);
  assert.deepEqual(app.discovery.discoverEvents({ sortBy: 'date', sortDirection: 'desc' }).map((event) => event.title),
    ['First Equal', 'Second Equal', 'Earlier']);
  assert.deepEqual(app.events.listPublishedEvents().map((event) => event.title), original);
});

test('price sorting is currency-specific, directional, stable, and puts missing prices last', () => {
  const app = createApplication();
  const high = addEvent(app, { title: 'High', eventDate: '2030-05-01T00:00:00Z',
    tiers: [{ name: 'Ticket', priceMinor: 900, currency: 'USD', capacity: 2 }] });
  const low = addEvent(app, { title: 'Low', eventDate: '2030-05-01T00:00:00Z',
    tiers: [{ name: 'Ticket', priceMinor: 100, currency: 'USD', capacity: 2 }] });
  const noUsd = addEvent(app, { title: 'No USD', eventDate: '2030-05-01T00:00:00Z',
    tiers: [{ name: 'Ticket', priceMinor: 1, currency: 'EUR', capacity: 2 }] });
  const soldOut = addEvent(app, { title: 'Sold Out USD', eventDate: '2030-05-01T00:00:00Z',
    tiers: [{ name: 'Ticket', priceMinor: 1, currency: 'USD', capacity: 1 }] });
  const noTiers = addEvent(app, { title: 'No Tiers', eventDate: '2030-05-01T00:00:00Z' });
  app.tickets.reserveInventory(soldOut.ticketTierIds[0], 1);

  assert.deepEqual(app.discovery.discoverEvents({ sortBy: 'price', currency: 'USD' }).map((event) => event.id),
    [low.id, high.id, noUsd.id, soldOut.id, noTiers.id]);
  assert.deepEqual(app.discovery.discoverEvents({ sortBy: 'price', sortDirection: 'desc', currency: 'USD' })
    .map((event) => event.id), [high.id, low.id, noUsd.id, soldOut.id, noTiers.id]);
});

test('availability sorting sums tiers, supports both directions, and preserves tie order', () => {
  const app = createApplication();
  const first = addEvent(app, { title: 'First Tie', eventDate: '2030-05-01T00:00:00Z',
    tiers: [{ name: 'A', priceMinor: 1, currency: 'USD', capacity: 3 }] });
  const most = addEvent(app, { title: 'Most', eventDate: '2030-05-01T00:00:00Z',
    tiers: [
      { name: 'A', priceMinor: 1, currency: 'USD', capacity: 5 },
      { name: 'B', priceMinor: 1, currency: 'EUR', capacity: 4 },
    ] });
  const second = addEvent(app, { title: 'Second Tie', eventDate: '2030-05-01T00:00:00Z',
    tiers: [{ name: 'A', priceMinor: 1, currency: 'USD', capacity: 3 }] });
  const soldOut = addEvent(app, { title: 'Sold Out', eventDate: '2030-05-01T00:00:00Z',
    tiers: [{ name: 'A', priceMinor: 1, currency: 'USD', capacity: 1 }] });
  app.tickets.reserveInventory(soldOut.ticketTierIds[0], 1);

  assert.deepEqual(app.discovery.discoverEvents({ sortBy: 'availability' }).map((event) => event.id),
    [most.id, first.id, second.id, soldOut.id]);
  assert.deepEqual(app.discovery.discoverEvents({ sortBy: 'availability', sortDirection: 'asc' }).map((event) => event.id),
    [soldOut.id, first.id, second.id, most.id]);
});