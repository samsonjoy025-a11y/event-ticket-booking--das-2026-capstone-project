# Build 1 Security Design

This document describes the controls and limitations of the in-memory domain core. Passing the initial tests does not make the application production-secure.

## Input Validation

Public service operations validate object shape, required strings, identifiers, dates, currency codes, integer amounts, capacities, and quantities. Domain checks stay in the owning service: booking quantity is 1 through 10, tier capacity must be positive, and reservations cannot exceed available inventory. Monetary values use safe integer minor units; decimals, negative amounts, invalid currencies, mismatched currencies, and arithmetic overflow are rejected.

Validation errors return stable application error codes and concise messages. Messages do not echo user-supplied values or stack traces. The in-memory implementation does not write attendee data or error details to logs.

## Identifiers and References

IDs and booking references use `node:crypto` `randomBytes`, never `Math.random()`. Each has a 128-bit random payload. The owning service checks for collisions and retries a bounded number of times before returning `INTERNAL_ERROR`. Uniqueness is enforced only within the current process lifetime; persistence will need a durable unique constraint.

## Data Isolation and Trust Boundaries

Each service owns its Maps and returns copies of records. Ticket inventory can only be changed using the ticket service reservation and release methods. Dependencies are injected through explicit interfaces, and every public service method validates its inputs. These are code-level boundaries within one trusted process, not network security boundaries or independent runtime fault domains.

## Current Limitations

- There is no authentication or authorization. An `attendeeId` is caller-supplied and is not proof of identity or ownership.
- State is volatile and shared by one process. There is no database transaction, multi-process concurrency control, backup, or recovery.
- There is no HTTP server, TLS, rate limiting, CSRF protection, or request-size control.
- There is no payment processing, refund policy, timed waitlist offer, or notification system.
- In-memory Maps and synchronous calls do not provide distributed locking or production-grade availability.

## Future Security Work

Later builds should add authenticated identities and role/ownership authorization, durable unique constraints, atomic inventory updates and cancellation, transport security, request rate and size limits, structured redacted audit events, secret management, dependency and runtime update procedures, and security tests for unauthorized access and concurrent operations. Security controls must be revisited when an API, database, or external integration is introduced.

## Build 2 Discovery Controls

Discovery accepts only an allowlist of query options and validates strings, UTC date boundaries, integer minor-unit ranges, currency codes, availability flags, and sort fields/directions before reading service data. Search uses literal case-insensitive substring checks; it does not build dynamic code or database queries. Results are projected from the documented event fields, and unpublished events are excluded even if a dependency unexpectedly includes one.

Price comparisons always include a validated currency and never convert or compare different currencies. Ticket Service errors and malformed batch responses become a sanitized `DEPENDENCY_UNAVAILABLE` error. A ticket-dependent query returns no partial results and does not substitute zero for missing prices or availability. Event-only searches do not call Ticket Service. No attendee identity is needed or logged by discovery; authentication and authorization remain out of scope.

Dates are compared as UTC instants. Date-only boundaries mean midnight UTC for the start and the last millisecond of that UTC day for the end; timestamp inputs require an explicit timezone offset. Locale-specific display formatting belongs to a future presentation layer.

## Build 3 HTTP Controls

The server uses Node's built-in HTTP and filesystem modules. Only `GET` is accepted; unsupported methods receive `405` with `Allow: GET`. Health responses contain only service status, a fixed service label, and a timestamp. Unknown routes and file errors return stable JSON messages without filesystem paths or stack traces. Basic headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer`.

Static serving resolves a single configured public root, rejects malformed/encoded traversal, backslashes, NULs, and dot-prefixed path segments, verifies the final real path remains inside that root (including symlink resolution), does not list directories, and serves only an extension allowlist. No source tree or environment files are under the static root. `public/` currently contains only a repository marker, not frontend assets. The health route is liveness only; it exposes no dependency details and is not a readiness check.

The server has no authentication, authorization, TLS termination, rate limiting, request-body processing, or production reverse-proxy configuration. It binds to loopback by default. Those limitations must be revisited before exposing the service publicly; authentication/authorization is reserved for Build 7 and broader HTTP hardening remains later roadmap work.