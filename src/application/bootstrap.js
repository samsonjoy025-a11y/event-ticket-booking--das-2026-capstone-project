import { createBookingService } from '../services/booking-service/booking.service.js';
import { createEventService } from '../services/event-service/event.service.js';
import { createEventDiscoveryService } from '../services/event-discovery-service/discovery.service.js';
import { createTicketService } from '../services/ticket-service/ticket.service.js';
import { createWaitlistService } from '../services/waitlist-service/waitlist.service.js';

export function createApplication() {
  const events = createEventService();
  const tickets = createTicketService({ events });
  const discovery = createEventDiscoveryService({ events, tickets });
  const waitlists = createWaitlistService();
  const bookings = createBookingService({ events, tickets, waitlists });

  return Object.freeze({ events, tickets, discovery, waitlists, bookings });
}