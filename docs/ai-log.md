# AI Log

## Build 1: Secure Modular Domain Core

- **Requested:** Implement the Build 1 event, ticket, booking, and FIFO waitlist domain core with integer minor-unit money, cryptographic IDs, explicit service interfaces, tests, demo, benchmark, and security documentation. Keep HTTP, persistence, payments, and later-build functionality out.
- **Implemented:** Added four in-memory services, shared validation/error/money/security modules, explicit bootstrap composition, service and integration tests, the terminal demo, the lookup benchmark, and architecture, boundary, and security documents.
- **Incorrect or incomplete:** An initial waitlist test expected duplicate rejection after the attendee had already been removed from the queue. The service permits rejoining after removal, so that assertion tested the wrong state.
- **Corrected:** Moved the duplicate assertion to the time when the attendee is still queued. No service behavior change was needed.
- **Learned:** Test the state that owns a rule: duplicate prevention applies while queued, while FIFO removal releases that attendee's place. Directory boundaries make ownership clearer but do not create process isolation.

## Build 2: Event Discovery and Stable Sorting

- **Requested:** Add a separate event discovery service for published-event search, city/date/price/availability filtering, stable custom merge sort, sorting, backlog acceptance criteria, automated tests, complexity documentation, and a multi-size benchmark. Preserve Build 1 and use only public service interfaces.
- **Implemented:** Added published-event listing/unpublishing and batched ticket-tier snapshots to their owning services; added the discovery service with strict option validation, event-only searches, ticket-dependent batch reads, sanitized dependency errors, stable merge sort, five discovery test files, integration coverage, algorithm documentation, backlog updates, and benchmark coverage for 1,000/5,000/10,000 events.
- **Incorrect or incomplete:** The first discovery pass attempted to attach a ticket summary to event-only results even when ticket data had intentionally not been fetched. Initial tests also held the pre-association event snapshot when reserving inventory.
- **Corrected:** Event-only results now omit discovery ticket summaries; tests use refreshed public event snapshots for associated tier IDs. Added checks proving event-only operation works without Ticket Service and tier data is not fabricated on dependency failures.
- **Learned:** A public batch read keeps inventory ownership with Ticket Service while avoiding per-event calls. Event data can be searched independently; price and availability need fresh ticket snapshots. Merge sort keeps ties stable by taking from the left half first.
- **Limitations:** Discovery is still in-process and in-memory. Benchmark timings remain environment-dependent; currency conversion, authentication, persistence, distributed fault isolation, API and frontend are out of scope.
- **Verification:** `npm test` passed 45 tests. `npm run demo` passed. `npm run benchmark` completed for 1,000, 5,000 and 10,000 events (two warm-up and five measured runs); see `docs/algorithm-analysis.md` for the recorded measurements.