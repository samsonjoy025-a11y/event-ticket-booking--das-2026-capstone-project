# Service Boundaries

Each service owns its validation and in-memory state. Other services call public methods and do not import or mutate private Maps.

## Event Service

Owns event records, event identifiers, draft/published state, and associated ticket-tier identifiers.

Public interface: `createEvent(input)`, `publishEvent(eventId)`, `getEvent(eventId)`, and `associateTicketTier(eventId, ticketTierId)`. `createEvent` starts in draft state. Event search is not part of this build.

## Ticket Service

Owns ticket-tier records, prices, capacity, and reserved quantity. It depends on the event service public interface to validate an event and associate a newly created tier.

Public interface: `createTicketTier(input)`, `getTicketTier(ticketTierId)`, `getAvailableQuantity(ticketTierId)`, `reserveInventory(ticketTierId, quantity)`, and `releaseInventory(ticketTierId, quantity)`. Inventory values are returned as snapshots; mutation is only available through reserve and release operations.

## Booking Service

Owns booking records and their Map keyed by booking reference. It depends on event, ticket, and waitlist service interfaces. Bookings are pending because payment is outside Build 1.

Public interface: `createBooking(input)`, `getBookingByReference(reference)`, and `cancelBooking(reference)`. Creation checks publication, event-tier ownership, quantity limits, and total before reserving inventory. Cancellation applies only to pending bookings, releases inventory once, and returns the next waitlisted attendee without consuming the queue entry. A second cancellation returns `INVALID_STATE`.

## Waitlist Service

Owns one linked-list FIFO queue per ticket tier. Duplicate attendee IDs are rejected while the attendee remains queued; removal allows that attendee to join again later.

Public interface: `addAttendee(input)`, `removeNextAttendee(ticketTierId)`, `peekNextAttendee(ticketTierId)`, `isEmpty(ticketTierId)`, and `getQueueSize(ticketTierId)`. Timed offers, expiry, and notifications are deferred.

## Shared Modules

`src/shared/validation/validate.js` provides field-level checks; domain-specific rules remain inside each service. `src/shared/money/money.js` uses safe integer minor units and explicit three-letter currency codes. `src/shared/security/secure-id.js` generates IDs and booking references using Node cryptographic randomness. `src/shared/errors/` defines stable error codes and public messages. `src/application/bootstrap.js` wires dependencies but contains no business rules.