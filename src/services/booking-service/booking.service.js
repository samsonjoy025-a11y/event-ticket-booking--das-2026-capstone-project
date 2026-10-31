import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/error-codes.js';
import { createSecureId } from '../../shared/security/secure-id.js';
import { multiplyMoney } from '../../shared/money/money.js';
import { assertIdentifier } from '../../shared/validation/validate.js';
import { MAX_ID_GENERATION_ATTEMPTS } from '../../shared/config/constants.js';
import { createUniqueBookingReference } from './booking-reference.service.js';
import { validateCreateBookingInput } from './booking.validation.js';

function createUniqueBookingId(existingIds, idGenerator) {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const id = assertIdentifier(idGenerator('booking'), 'generated identifier');
    if (!existingIds.has(id)) return id;
  }

  throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Unable to allocate a unique identifier.');
}

function copyBooking(booking) {
  return { ...booking, total: { ...booking.total } };
}

export function createBookingService({
  events,
  tickets,
  waitlists,
  idGenerator = createSecureId,
  referenceGenerator,
} = {}) {
  if (!events || typeof events.getEvent !== 'function') {
    throw new TypeError('Booking service requires the event service public interface.');
  }
  if (!tickets || typeof tickets.getTicketTier !== 'function'
    || typeof tickets.reserveInventory !== 'function'
    || typeof tickets.releaseInventory !== 'function') {
    throw new TypeError('Booking service requires the ticket service public interface.');
  }
  if (!waitlists || typeof waitlists.peekNextAttendee !== 'function') {
    throw new TypeError('Booking service requires the waitlist service public interface.');
  }

  const bookingsByReference = new Map();
  const bookingIds = new Set();

  function getStoredBooking(reference) {
    const bookingReference = assertIdentifier(reference, 'bookingReference');
    const booking = bookingsByReference.get(bookingReference);
    if (!booking) throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking was not found.');
    return booking;
  }

  return Object.freeze({
    createBooking(input) {
      const bookingInput = validateCreateBookingInput(input);
      const event = events.getEvent(bookingInput.eventId);
      if (event.status !== 'published') {
        throw new AppError(ERROR_CODES.INVALID_STATE, 'Bookings require a published event.');
      }

      const tier = tickets.getTicketTier(bookingInput.ticketTierId);
      if (tier.eventId !== event.id || !event.ticketTierIds.includes(tier.id)) {
        throw new AppError(ERROR_CODES.VALIDATION, 'Ticket tier does not belong to this event.');
      }

      const total = multiplyMoney(
        { amountMinor: tier.priceMinor, currency: tier.currency },
        bookingInput.quantity,
      );
      const id = createUniqueBookingId(bookingIds, idGenerator);
      const reference = createUniqueBookingReference(bookingsByReference, referenceGenerator);
      const booking = {
        id,
        reference,
        eventId: event.id,
        ticketTierId: tier.id,
        attendeeId: bookingInput.attendeeId,
        quantity: bookingInput.quantity,
        total,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      tickets.reserveInventory(tier.id, booking.quantity);
      bookingsByReference.set(reference, booking);
      bookingIds.add(id);
      return copyBooking(booking);
    },

    getBookingByReference(reference) {
      return copyBooking(getStoredBooking(reference));
    },

    cancelBooking(reference) {
      const booking = getStoredBooking(reference);
      if (booking.status !== 'pending') {
        throw new AppError(ERROR_CODES.INVALID_STATE, 'Only pending bookings can be cancelled.');
      }

      tickets.releaseInventory(booking.ticketTierId, booking.quantity);
      const cancelled = { ...booking, status: 'cancelled', cancelledAt: new Date().toISOString() };
      bookingsByReference.set(booking.reference, cancelled);

      return {
        booking: copyBooking(cancelled),
        availableQuantity: tickets.getAvailableQuantity(booking.ticketTierId),
        nextWaitlistedAttendee: waitlists.peekNextAttendee(booking.ticketTierId),
      };
    },
  });
}