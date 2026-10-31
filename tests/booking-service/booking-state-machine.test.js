import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOKING_STATES,
  resolveBookingTransition,
} from '../../src/services/booking-service/booking-state-machine.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

test('allows the currently supported pending-to-cancelled transition', () => {
  assert.equal(resolveBookingTransition(BOOKING_STATES.PENDING, 'cancel'), BOOKING_STATES.CANCELLED);
});

test('rejects repeated cancellation, confirmation, refund, expiry, and invalid states', () => {
  const invalidTransitions = [
    [BOOKING_STATES.CANCELLED, 'cancel'],
    [BOOKING_STATES.PENDING, 'confirm'],
    [BOOKING_STATES.CANCELLED, 'confirm'],
    [BOOKING_STATES.CONFIRMED, 'refund'],
    [BOOKING_STATES.PENDING, 'expire'],
    ['unknown', 'cancel'],
  ];

  for (const [state, action] of invalidTransitions) {
    assert.throws(() => resolveBookingTransition(state, action), (error) => {
      assert.equal(error.code, ERROR_CODES.INVALID_STATE);
      return true;
    });
  }
});