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

## Build 3: Architecture, Booking State Machine, and Server Foundation

- **Requested:** Document the current architecture and service boundaries, centralize booking transition validation without introducing payment/refund/expiry behavior, and add a native Node HTTP server with only `GET /health` plus confined static-file serving.
- **Implemented:** Added a booking state transition guard, server configuration and startup entry point, HTTP router, health and static controllers, an empty `public/` root, server/state-machine tests, and Build 3 architecture and security documentation.
- **Incorrect or incomplete:** The first static-root marker was empty and was not materialized by the file operation, so Git had no `public/` directory to track. An early HTTP test also had an irrelevant nonexistent-file assertion.
- **Corrected:** Added a meaningful `.gitkeep` marker (dotfiles remain inaccessible over HTTP), removed the irrelevant assertion, and made traversal tests assert the exact sanitized 404 body. Added an outer HTTP error boundary so unexpected controller failures cannot leak details.
- **Learned:** The backlog does not define a separate Build 3 user story. Existing domain behavior supports only pending-to-cancelled; payment confirmation, refunds, and expiry remain disabled until their roadmap builds.
- **Verification:** `npm test` passed 54 tests. `npm run demo` passed. `npm start` listened on `127.0.0.1:3000`; live `GET /health` returned 200 JSON, `/` returned a safe 404 because no frontend exists yet, `/.gitkeep` was denied, and an encoded traversal request returned a sanitized 404. Focused server tests pass (7), and no editor diagnostics were reported.