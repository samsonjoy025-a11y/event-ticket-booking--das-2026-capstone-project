import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventService } from '../../src/services/event-service/index.js';
import { AppError } from '../../src/shared/errors/app-error.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

const validEvent = {
  title: 'City Sounds',
  city: 'Lagos',
  venue: 'Civic Hall',
  eventDate: '2030-05-10T18:00:00.000Z',
};

test('creates a draft event with a unique ID and controlled ticket-tier association', () => {
  const service = createEventService();
  const event = service.createEvent(validEvent);

  assert.match(event.id, /^event_[a-f0-9]{32}$/);
  assert.equal(event.status, 'draft');
  assert.deepEqual(event.ticketTierIds, []);
  assert.equal(service.getEvent(event.id).title, validEvent.title);

  event.ticketTierIds.push('fake_tier');
  assert.deepEqual(service.getEvent(event.id).ticketTierIds, []);

  const associated = service.associateTicketTier(event.id, 'tier_123');
  assert.deepEqual(associated.ticketTierIds, ['tier_123']);
});

test('rejects invalid event fields and invalid state transitions', () => {
  const service = createEventService();
  assert.throws(() => service.createEvent({ ...validEvent, title: ' ' }), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, ERROR_CODES.VALIDATION);
    return true;
  });
  assert.throws(() => service.createEvent({ ...validEvent, eventDate: 'not-a-date' }), AppError);

  const event = service.createEvent(validEvent);
  assert.equal(service.publishEvent(event.id).status, 'published');
  assert.throws(() => service.publishEvent(event.id), (error) => error.code === ERROR_CODES.INVALID_STATE);
  assert.throws(() => service.getEvent('event_missing'), (error) => error.code === ERROR_CODES.NOT_FOUND);
});