import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookingService } from '../../src/services/booking-service/index.js';
import { createEventService } from '../../src/services/event-service/index.js';
import { createTicketService } from '../../src/services/ticket-service/index.js';
import { createWaitlistService } from '../../src/services/waitlist-service/index.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

function createBookingFixture({ capacity = 5, priceMinor = 1250 } = {}) {
  const events = createEventService();
  const event = events.createEvent({
    title: 'City Sounds', city: 'Lagos', venue: 'Civic Hall', eventDate: '2030-05-10T18:00:00Z',
  });
  const tickets = createTicketService({ events });
  const tier = tickets.createTicketTier({
    eventId: event.id, name: 'General', priceMinor, currency: 'USD', capacity,
  });
  events.publishEvent(event.id);
  const waitlists = createWaitlistService();
  const bookings = createBookingService({ events, tickets, waitlists });
  return { events, event, tickets, tier, waitlists, bookings };
}

test('creates pending bookings, calculates minor-unit totals, and finds by reference', () => {
  const { bookings, event, tier, tickets } = createBookingFixture();
  const booking = bookings.createBooking({
    eventId: event.id, ticketTierId: tier.id, attendeeId: 'attendee_1', quantity: 2,
  });

  assert.equal(booking.status, 'pending');
  assert.equal(booking.total.amountMinor, 2500);
  assert.equal(booking.total.currency, 'USD');
  assert.equal(tickets.getAvailableQuantity(tier.id), 3);
  assert.deepEqual(bookings.getBookingByReference(booking.reference), booking);
  assert.throws(() => bookings.getBookingByReference('BK-UNKNOWN'), (error) => error.code === ERROR_CODES.NOT_FOUND);
});

test('rejects invalid quantities before inventory changes', () => {
  const { bookings, event, tier, tickets } = createBookingFixture({ capacity: 20 });

  for (const quantity of [0, -1, 1.5, 11]) {
    assert.throws(() => bookings.createBooking({
      eventId: event.id, ticketTierId: tier.id, attendeeId: `attendee_${String(quantity).replace('.', '_')}`, quantity,
    }), (error) => error.code === ERROR_CODES.VALIDATION);
    assert.equal(tickets.getAvailableQuantity(tier.id), 20);
  }
});

test('rejects sold-out and cross-event bookings without reserving inventory', () => {
  const fixture = createBookingFixture({ capacity: 1 });
  const { bookings, event, tier, tickets } = fixture;
  bookings.createBooking({ eventId: event.id, ticketTierId: tier.id, attendeeId: 'attendee_1', quantity: 1 });

  assert.throws(() => bookings.createBooking({
    eventId: event.id, ticketTierId: tier.id, attendeeId: 'attendee_2', quantity: 1,
  }), (error) => error.code === ERROR_CODES.SOLD_OUT);
  assert.equal(tickets.getAvailableQuantity(tier.id), 0);

  const otherEvent = fixture.events.createEvent({
    title: 'Other Event', city: 'Lagos', venue: 'Other Hall', eventDate: '2030-06-10T18:00:00Z',
  });
  fixture.events.publishEvent(otherEvent.id);
  assert.throws(() => bookings.createBooking({
    eventId: otherEvent.id, ticketTierId: tier.id, attendeeId: 'attendee_3', quantity: 1,
  }), (error) => error.code === ERROR_CODES.VALIDATION);
  assert.equal(tickets.getAvailableQuantity(tier.id), 0);
});

test('allows the maximum quantity and cancels exactly once while exposing the next waitlisted attendee', () => {
  const { bookings, event, tier, tickets, waitlists } = createBookingFixture({ capacity: 10, priceMinor: 99 });
  const booking = bookings.createBooking({
    eventId: event.id, ticketTierId: tier.id, attendeeId: 'attendee_1', quantity: 10,
  });
  waitlists.addAttendee({ ticketTierId: tier.id, attendeeId: 'attendee_2', displayName: 'First in line' });
  waitlists.addAttendee({ ticketTierId: tier.id, attendeeId: 'attendee_3', displayName: 'Second in line' });

  assert.equal(booking.total.amountMinor, 990);
  const result = bookings.cancelBooking(booking.reference);
  assert.equal(result.booking.status, 'cancelled');
  assert.equal(result.availableQuantity, 10);
  assert.equal(result.nextWaitlistedAttendee.displayName, 'First in line');
  assert.equal(waitlists.getQueueSize(tier.id), 2);
  assert.equal(tickets.getAvailableQuantity(tier.id), 10);

  assert.throws(() => bookings.cancelBooking(booking.reference), (error) => error.code === ERROR_CODES.INVALID_STATE);
  assert.equal(tickets.getAvailableQuantity(tier.id), 10);
});

test('booking a draft event is rejected', () => {
  const events = createEventService();
  const event = events.createEvent({
    title: 'Draft Event', city: 'Lagos', venue: 'Civic Hall', eventDate: '2030-05-10T18:00:00Z',
  });
  const tickets = createTicketService({ events });
  const tier = tickets.createTicketTier({
    eventId: event.id, name: 'General', priceMinor: 100, currency: 'USD', capacity: 2,
  });
  const bookings = createBookingService({ events, tickets, waitlists: createWaitlistService() });

  assert.throws(() => bookings.createBooking({
    eventId: event.id, ticketTierId: tier.id, attendeeId: 'attendee_1', quantity: 1,
  }), (error) => error.code === ERROR_CODES.INVALID_STATE);
  assert.equal(tickets.getAvailableQuantity(tier.id), 2);
});