import {
  assertObjectFields,
  assertPositiveInteger,
  assertIdentifier,
} from '../../shared/validation/validate.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/error-codes.js';
import { MAX_BOOKING_QUANTITY } from '../../shared/config/constants.js';

export { MAX_BOOKING_QUANTITY };

export function validateCreateBookingInput(input) {
  assertObjectFields(input, ['eventId', 'ticketTierId', 'attendeeId', 'quantity'], 'booking');

  const quantity = assertPositiveInteger(input.quantity, 'quantity');
  if (quantity > MAX_BOOKING_QUANTITY) {
    throw new AppError(ERROR_CODES.VALIDATION, `quantity cannot exceed ${MAX_BOOKING_QUANTITY}.`);
  }

  return {
    eventId: assertIdentifier(input.eventId, 'eventId'),
    ticketTierId: assertIdentifier(input.ticketTierId, 'ticketTierId'),
    attendeeId: assertIdentifier(input.attendeeId, 'attendeeId'),
    quantity,
  };
}