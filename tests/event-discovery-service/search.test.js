import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/bootstrap.js';
import { createEventDiscoveryService } from '../../src/services/event-discovery-service/index.js';

function createPublishedEvent(app, title, city, venue) {
  const event = app.events.createEvent({
    title,
    city,
    venue,
    eventDate: '2030-05-10T18:00:00.000Z',
  });
  app.events.publishEvent(event.id);
  return event;
}

test('search matches title, city, or venue case-insensitively after trimming', () => {
  const app = createApplication();
  createPublishedEvent(app, 'Future Tech Summit', 'Lagos', 'Civic Centre');
  createPublishedEvent(app, 'Garden Festival', 'Nairobi', 'Tech Pavilion');
  createPublishedEvent(app, 'Jazz Evening', 'Accra', 'Harbour Hall');

  assert.equal(app.discovery.discoverEvents({ query: '  fUtUrE tEcH ' })[0].title, 'Future Tech Summit');
  assert.equal(app.discovery.discoverEvents({ query: ' LAGOS ' })[0].title, 'Future Tech Summit');
  assert.equal(app.discovery.discoverEvents({ query: 'pAvIlIoN' })[0].title, 'Garden Festival');
  assert.deepEqual(app.discovery.discoverEvents({ query: 'does not exist' }), []);
});

test('empty search returns published events only and leaves service snapshots unchanged', () => {
  const app = createApplication();
  const visible = createPublishedEvent(app, 'Public Event', 'Lagos', 'Civic Centre');
  const draft = app.events.createEvent({
    title: 'Private Draft', city: 'Lagos', venue: 'Hidden Hall', eventDate: '2030-05-10T18:00:00Z',
  });
  const before = app.events.listPublishedEvents();

  const results = app.discovery.discoverEvents({ query: '   ' });
  results[0].ticketTierIds.push('fake_tier');

  assert.deepEqual(app.discovery.discoverEvents({}), before);
  assert.deepEqual(app.discovery.discoverEvents({}).map((event) => event.id), [visible.id]);
  assert.equal(app.events.getEvent(draft.id).status, 'draft');
});

test('event-only search does not require the Ticket Service', () => {
  const app = createApplication();
  const event = createPublishedEvent(app, 'Open Lecture', 'Dublin', 'Main Hall');
  const discovery = createEventDiscoveryService({ events: app.events });

  assert.equal(discovery.discoverEvents({ query: 'lecture' })[0].id, event.id);
});