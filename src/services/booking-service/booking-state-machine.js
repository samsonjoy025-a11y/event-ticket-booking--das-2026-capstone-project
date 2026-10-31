import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/error-codes.js';

export const BOOKING_STATES = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  EXPIRED: 'expired',
});

const ENABLED_TRANSITIONS = new Map([
  [`${BOOKING_STATES.PENDING}:cancel`, BOOKING_STATES.CANCELLED],
]);

export function resolveBookingTransition(currentState, action) {
  if (!Object.values(BOOKING_STATES).includes(currentState)) {
    throw new AppError(ERROR_CODES.INVALID_STATE, 'Booking has an invalid state.');
  }

  const nextState = ENABLED_TRANSITIONS.get(`${currentState}:${action}`);
  if (!nextState) {
    throw new AppError(ERROR_CODES.INVALID_STATE, 'Booking transition is not permitted.');
  }

  return nextState;
}