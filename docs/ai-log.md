# AI Log

## Build 1: Secure Modular Domain Core

- **Requested:** Implement the Build 1 event, ticket, booking, and FIFO waitlist domain core with integer minor-unit money, cryptographic IDs, explicit service interfaces, tests, demo, benchmark, and security documentation. Keep HTTP, persistence, payments, and later-build functionality out.
- **Implemented:** Added four in-memory services, shared validation/error/money/security modules, explicit bootstrap composition, service and integration tests, the terminal demo, the lookup benchmark, and architecture, boundary, and security documents.
- **Incorrect or incomplete:** An initial waitlist test expected duplicate rejection after the attendee had already been removed from the queue. The service permits rejoining after removal, so that assertion tested the wrong state.
- **Corrected:** Moved the duplicate assertion to the time when the attendee is still queued. No service behavior change was needed.
- **Learned:** Test the state that owns a rule: duplicate prevention applies while queued, while FIFO removal releases that attendee's place. Directory boundaries make ownership clearer but do not create process isolation.