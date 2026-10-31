# Event Ticketing Architecture

Builds 1 and 2 run in a single Node.js process with independently owned domain modules and in-memory state. The structure establishes code ownership and explicit service contracts; it does not provide deployment or process-level microservice isolation.

```mermaid
flowchart LR
  Bootstrap[Application bootstrap] --> Events[Event service]
  Bootstrap --> Tickets[Ticket service]
  Bootstrap --> Bookings[Booking service]
  Bootstrap --> Waitlists[Waitlist service]
  Bootstrap --> Discovery[Event discovery service]
  Tickets -->|event lookup and tier association| Events
  Bookings -->|event lookup| Events
  Bookings -->|reserve, release, inventory query| Tickets
  Bookings -->|inspect next attendee| Waitlists
  Discovery -->|published event snapshots| Events
  Discovery -->|batched current tier snapshots| Tickets
```

## Runtime Flow

1. The event service creates an event in `draft` state and publishes it through an explicit state transition.
2. The ticket service validates a tier, checks its event through the event service interface, and associates the tier through that same interface.
3. The booking service accepts bookings only for published events and verifies that the tier belongs to that event.
4. The booking service validates quantity and total before requesting an inventory reservation. The ticket service is the only owner of capacity and reserved-quantity state.
5. Cancellation releases inventory through the ticket service, changes the pending booking to `cancelled`, and inspects (but does not remove) the next waitlisted attendee.

## Data and Consistency

Each service owns its Maps. Results crossing a service boundary are copied so callers cannot mutate stored records. Booking references are the keys in the booking lookup Map. The linked-list waitlist uses a Map of ticket-tier IDs to queue instances; it does not use an array as its queue.

Operations are synchronous and in memory. That makes each individual JavaScript call run to completion in this process, but it does not solve concurrent writes across processes, machines, or future database connections. A persistent implementation will need atomic storage operations and transaction or compare-and-set semantics for inventory and cancellation.

## Replacement Path

Bootstrap constructs services from explicit dependencies. Future persistence adapters can implement the same narrow operations used by the booking service, especially ticket lookup, reservation, release, and availability. HTTP routes, databases, payment handling, authentication, and asynchronous messaging are intentionally deferred.

## Event Discovery (Build 2)

The Event Discovery Service owns query validation, text matching, filtering, result enrichment, and sorting. It does not create events, change publication state, or mutate ticket inventory. It obtains published event snapshots from `listPublishedEvents()` and, only when price or availability data is requested, obtains current tier snapshots through one `getTicketTiersForEvents(eventIds)` batch call. Event-only queries do not require Ticket Service at runtime.

The service filters event fields before asking for ticket snapshots, avoiding unnecessary batch work. It validates that the batch result matches each event's associated tier IDs and returns no partial results when a required dependency is unavailable. Errors are normalized to `DEPENDENCY_UNAVAILABLE`; user validation remains `VALIDATION`.

The application still executes all services in one process. A future independently deployed discovery service will need explicit network contracts, deadlines/timeouts, bounded retries where safe, circuit breaking, observability, and a policy for stale read models. None is introduced here.