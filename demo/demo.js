import { createApplication } from '../src/application/bootstrap.js';
import { AppError } from '../src/shared/errors/app-error.js';

const app = createApplication();
const event = app.events.createEvent({
  title: 'Build One Live',
  city: 'Lagos',
  venue: 'Civic Hall',
  eventDate: '2030-05-10T18:00:00.000Z',
});
const tier = app.tickets.createTicketTier({
  eventId: event.id,
  name: 'General Admission',
  priceMinor: 450000,
  currency: 'NGN',
  capacity: 3,
});
app.events.publishEvent(event.id);

const firstBooking = app.bookings.createBooking({
  eventId: event.id,
  ticketTierId: tier.id,
  attendeeId: 'attendee_ada',
  quantity: 2,
});
app.bookings.createBooking({
  eventId: event.id,
  ticketTierId: tier.id,
  attendeeId: 'attendee_grace',
  quantity: 1,
});
console.log(`Created event: ${event.title} in ${event.city}`);
console.log(`Available tickets after successful bookings: ${app.tickets.getAvailableQuantity(tier.id)}`);

try {
  app.bookings.createBooking({
    eventId: event.id,
    ticketTierId: tier.id,
    attendeeId: 'attendee_katherine',
    quantity: 1,
  });
} catch (error) {
  if (!(error instanceof AppError)) throw error;
  console.log(`Additional booking rejected: ${error.code}`);
}

for (const [attendeeId, displayName] of [
  ['attendee_katherine', 'Katherine'],
  ['attendee_margaret', 'Margaret'],
  ['attendee_dorothy', 'Dorothy'],
]) {
  app.waitlists.addAttendee({ ticketTierId: tier.id, attendeeId, displayName });
}
console.log(`Waitlist size: ${app.waitlists.getQueueSize(tier.id)}`);

const cancellation = app.bookings.cancelBooking(firstBooking.reference);
console.log(`Cancelled booking: ${cancellation.booking.reference}`);
console.log(`Available tickets after cancellation: ${cancellation.availableQuantity}`);
console.log(`Next attendee in FIFO order: ${cancellation.nextWaitlistedAttendee.displayName}`);
console.log('The attendee remains queued; timed offers are outside Build 1.');