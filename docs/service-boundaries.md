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

## Event Service Additions (Build 2)

`listPublishedEvents()` returns copies of published event snapshots only. `unpublishEvent(eventId)` transitions a published event back to draft; invalid transitions return `INVALID_STATE`. The service retains ownership of publication state and does not implement search.

## Ticket Service Additions (Build 2)

`getTicketTiersForEvents(eventIds)` returns current tier snapshots grouped by the requested event IDs, including empty groups for events with no tiers. Each snapshot contains current `availableQuantity`, not internal reserved state. The read is batched and read-only; ticket inventory mutation remains restricted to reserve/release operations.

## Event Discovery Service (Build 2)

Owns discovery input validation, text search over title/city/venue, city and date filtering, currency-aware price filtering, availability filtering, and stable sorting.

Public interface: `discoverEvents(options)`. Options include `query`, `city`, `startDate`, `endDate`, `minPriceMinor`, `maxPriceMinor`, `currency`, `availableOnly`, `sortBy` (`date`, `price`, or `availability`), and `sortDirection` (`asc` or `desc`). It calls Event Service first, then calls Ticket Service once in batch only when price/availability criteria or sorting require ticket data. If a required dependency fails or returns inconsistent tier information, it returns `DEPENDENCY_UNAVAILABLE` rather than partial or fabricated results.

Price comparison uses the lowest-priced currently available tier for the requested currency; no currency conversion is attempted. Availability is the sum of available quantities across all tiers. Date-only boundaries are interpreted in UTC, timestamps require an explicit offset, and both boundaries are inclusive. Stable sort ties retain the event service's source order. Search-only and event-date-only requests remain independent of ticket data.

## Booking State Machine (Build 3)

Booking Service owns lifecycle status and calls its internal transition guard before changing a booking. The currently enabled action is cancellation from `pending` to `cancelled`; the service releases inventory through Ticket Service exactly once before storing the transition. Callers cannot set an arbitrary status through the public Booking Service interface. Confirmation, refund, and expiry transitions are deferred to their roadmap builds.

## HTTP and Static Serving (Build 3)

The server router owns request dispatch only. The health controller creates a liveness payload; the static controller reads only supported files under `public/`. Neither controller reaches into domain-service Maps. Build 4 API controllers will call the application-composed public service interfaces; they must not reproduce business rules in routes. The current `/health` check is independent of Event, Ticket, Booking, Waitlist, and Discovery dependencies.