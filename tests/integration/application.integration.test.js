import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/bootstrap.js';

test('application composition supports event, ticket, booking, cancellation, and waitlist flow', () => {
  const app = createApplication();
  const event = app.events.createEvent({
    title: 'Build One Live', city: 'Lagos', venue: 'Civic Hall', eventDate: '2030-05-10T18:00:00Z',
  });
  const tier = app.tickets.createTicketTier({
    eventId: event.id, name: 'General', priceMinor: 5000, currency: 'NGN', capacity: 1,
  });
  app.events.publishEvent(event.id);
  const booking = app.bookings.createBooking({
    eventId: event.id, ticketTierId: tier.id, attendeeId: 'attendee_1', quantity: 1,
  });
  app.waitlists.addAttendee({ ticketTierId: tier.id, attendeeId: 'attendee_2', displayName: 'Next attendee' });

  assert.equal(app.tickets.getAvailableQuantity(tier.id), 0);
  assert.throws(() => app.bookings.createBooking({
    eventId: event.id, ticketTierId: tier.id, attendeeId: 'attendee_3', quantity: 1,
  }), (error) => error.code === 'SOLD_OUT');

  const cancelled = app.bookings.cancelBooking(booking.reference);
  assert.equal(cancelled.availableQuantity, 1);
  assert.equal(cancelled.nextWaitlistedAttendee.displayName, 'Next attendee');
});