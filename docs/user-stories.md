# Product Backlog: User Stories

Each Build is one sprint. The "Build" column says which build finishes the story end to end (rules, API and screen where it applies). Several stories are touched in more than one build. Build 2 implements domain-level event discovery and automated tests; API, frontend, persistence, authentication and CI delivery remain assigned to later Builds.

## Roles

| Role | Does |
|---|---|
| Organizer | Creates, edits and publishes events and ticket tiers |
| Attendee | Browses, books, pays, cancels, joins waitlists |
| Staff | Checks people in at the door |

## Backlog

| ID | Role | User requirement | Business value | Priority | Build |
|---|---|---|---|---|---|
| S01 | visitor | sign up and log in | my bookings are private | Must | 7 |
| S02 | organizer | create an event with title, city, venue and date | people can find it | Must | 2 (rules), 4 (API), 7 (screen) |
| S03 | organizer | add ticket tiers with a price and capacity | I can sell different kinds of ticket | Must | 2, 4, 7 |
| S04 | organizer | publish and unpublish an event | I control when it goes public | Must | 2, 4, 7 |
| S05 | attendee | search, filter and sort published events | I can find one I like | Must | 2, 4, 6 |
| S06 | attendee | book a number of tickets from a tier | I get a place | Must | 2, 4, 6 |
| S07 | attendee | pay for a booking (mock payment) | the booking is confirmed | Must | 4, 6 |
| S08 | attendee | be certain the last ticket is sold to only one person | nobody turns up to a full event | Must | 5 |
| S09 | attendee | cancel a booking and get a refund by the policy | I am not stuck if plans change | Must | 8 |
| S10 | attendee | have unpaid bookings expire | seats are not locked forever | Must | 8 |
| S11 | attendee | join a waitlist for a sold-out tier | I can still get a seat if one frees up | Should | 8 |
| S12 | attendee | be offered a freed seat, in order, for a limited time | the process is fair | Should | 8 |
| S13 | attendee | see only my own bookings | my data is private | Must | 7 |
| S14 | staff | scan a ticket's QR code at the door | I can admit the right people | Must | 9 |
| S15 | staff | have forged and repeated scans rejected | nobody gets in twice or with a fake | Must | 9 |
| S16 | team | run automated tests on every push | we notice breakage early | Should | 2 to 9 |

**Stretch:** organizer sales dashboard, per-seat tickets, promo codes, waitlist notifications, partial refunds, organizer cancels the whole event.

## Build 2 Acceptance Criteria

### S02: Create an event

- **Given** valid title, city, venue and date values **When** an organizer creates an event **Then** the Event Service stores a draft event with those values and a unique identifier.
- **Given** a missing or invalid required field **When** an organizer creates an event **Then** creation is rejected with `VALIDATION` and no event is added.

### S03: Create ticket tiers

- **Given** an existing event and a valid tier name, non-negative integer minor-unit price, three-letter currency and positive integer capacity **When** an organizer creates a tier **Then** the tier is associated with that event and starts with its full capacity available.
- **Given** a negative or fractional price, invalid currency, or non-positive/fractional capacity **When** an organizer creates a tier **Then** it is rejected and no tier association is added.

### S04: Publish and unpublish an event

- **Given** a draft event **When** an organizer publishes it **Then** its status becomes published and it may appear in discovery.
- **Given** a published event **When** an organizer unpublishes it **Then** its status becomes draft and it is absent from discovery results.
- **Given** an invalid publication transition **When** the operation is requested **Then** it is rejected with `INVALID_STATE`.

### S05: Discover published events

- **Given** published events with title, city and venue values **When** an attendee searches using text with any letter case or surrounding whitespace **Then** events matching any of those fields are returned and drafts are excluded.
- **Given** a city filter **When** it is applied **Then** only exact city matches remain, ignoring case and surrounding whitespace.
- **Given** start and end dates **When** a date filter is applied **Then** matching UTC event instants include both boundaries; date-only end values include that entire UTC day.
- **Given** a minimum or maximum price **When** price filtering is requested **Then** a currency is required, integer minor units are compared only within that currency, and both price bounds are inclusive.
- **Given** an event with multiple tiers **When** a price filter is applied **Then** its price is the lowest currently available tier in the requested currency; an event without such a tier does not match.
- **Given** `availableOnly: true` **When** discovery runs **Then** only events with a positive sum of current available quantities across their tiers are returned.
- **Given** multiple search and filter criteria **When** combined in one request **Then** every supplied criterion is satisfied by each returned event and the source event snapshots remain unchanged.
- **Given** a sort request **When** results are sorted by date, price or availability **Then** the custom stable merge sort is used; date defaults earliest first, price lowest first, availability highest first, and equal keys retain source order.
- **Given** unsupported options, invalid dates, reversed ranges, invalid currencies, or invalid sort directions **When** discovery is requested **Then** it is rejected with `VALIDATION`.
- **Given** Event Service or required Ticket Service data is unavailable **When** discovery is requested **Then** it returns a controlled dependency error and no partial or fabricated results.

## Existing Acceptance Criteria

### S06: Book tickets

- **Given** a published event with 3 seats left in General
  **When** an attendee books 2
  **Then** a pending booking is created for 2 seats, priced in whole cents, and 1 seat is left.
- **Given** 1 seat left
  **When** an attendee books 2
  **Then** the booking is rejected with `SOLD_OUT` and nothing changes.
- **Given** any tier
  **When** the quantity is 0, negative, fractional or more than 10
  **Then** the request is rejected with `VALIDATION`.

### S08: Last ticket (finished in Build 5)

- **Given** exactly 1 seat left
  **When** 50 attendees try to book it at the same moment
  **Then** exactly 1 booking succeeds, 49 get `SOLD_OUT`, and seats sold never exceeds capacity.

### S09: Cancel and refund

- **Given** a paid booking and an event 10 days away
  **When** the attendee cancels
  **Then** 100% is refunded and the seats are released once.
- **Given** an event 3 days away **Then** 50% is refunded.
- **Given** an event 1 day away **Then** nothing is refunded, but the seats are still released.
- **Given** a booking that is already cancelled or refunded
  **When** the attendee cancels again
  **Then** the request is rejected and the seats are not released a second time.

### S12: Waitlist offers

- **Given** three people on the waitlist in order A, B, C
  **When** a seat is freed
  **Then** A (not B or C) is offered it, and the seat is held for A.
- **Given** A does not accept in time
  **When** the offer expires
  **Then** the seat passes to B.

### S15: Check-in

- **Given** a QR code that was edited or made up **Then** it is rejected as invalid.
- **Given** a valid code that has already been scanned **Then** it is rejected as a duplicate and shows when it was first used.
- **Given** a booking that was refunded or cancelled **Then** its code is rejected.

## Definition of done (every story)

1. The rule works and has at least one test, including an edge case.
2. It is reachable the way a user would reach it (API, and screen where it applies).
3. The AI log has an entry for anything the AI got wrong.
4. It is merged through a pull request.
