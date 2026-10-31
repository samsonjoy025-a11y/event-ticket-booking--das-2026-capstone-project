import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaitlistService, LinkedListQueue } from '../../src/services/waitlist-service/index.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

test('linked-list queue preserves FIFO order and returns null when empty', () => {
  const queue = new LinkedListQueue();
  assert.equal(queue.isEmpty(), true);
  assert.equal(queue.size, 0);
  assert.equal(queue.peek(), null);
  assert.equal(queue.dequeue(), null);

  queue.enqueue('first');
  queue.enqueue('second');
  assert.equal(queue.size, 2);
  assert.equal(queue.peek(), 'first');
  assert.equal(queue.dequeue(), 'first');
  assert.equal(queue.dequeue(), 'second');
  assert.equal(queue.isEmpty(), true);
  assert.equal(queue.size, 0);
});

test('waitlist keeps separate queues per tier, supports inspection and removal, and rejects duplicates', () => {
  const waitlists = createWaitlistService();
  const first = { ticketTierId: 'tier_1', attendeeId: 'attendee_1', displayName: 'Ada' };
  waitlists.addAttendee(first);
  waitlists.addAttendee({ ticketTierId: 'tier_1', attendeeId: 'attendee_2', displayName: 'Grace' });
  waitlists.addAttendee({ ticketTierId: 'tier_2', attendeeId: 'attendee_1', displayName: 'Ada' });

  assert.equal(waitlists.getQueueSize('tier_1'), 2);
  assert.equal(waitlists.peekNextAttendee('tier_1').displayName, 'Ada');
  assert.throws(() => waitlists.addAttendee(first), (error) => error.code === ERROR_CODES.CONFLICT);
  assert.equal(waitlists.removeNextAttendee('tier_1').displayName, 'Ada');
  assert.equal(waitlists.peekNextAttendee('tier_1').displayName, 'Grace');
  assert.equal(waitlists.peekNextAttendee('tier_2').displayName, 'Ada');
  assert.equal(waitlists.removeNextAttendee('tier_1').displayName, 'Grace');
  assert.equal(waitlists.removeNextAttendee('tier_1'), null);
  assert.equal(waitlists.isEmpty('tier_1'), true);
});