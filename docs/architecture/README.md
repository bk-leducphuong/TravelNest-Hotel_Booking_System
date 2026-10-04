# Target Architecture

The end state we are steering toward, taken from `plan/overall_plan.md` and
`plan/service_extraction_order.md`: the Node monolith shrinks to a thin API
gateway/BFF while bounded contexts become Go services that communicate over
NATS JetStream.

Today's modular monolith is the same picture with all services collapsed into
one Node process and the event bus in-process.

## Diagrams

- [System topology](./system-topology.md) — gateway, services, NATS, data stores
- [Bounded context](./bounded-context.md) — the internal shape of every module/service
- [Booking → payment saga](./booking-payment-saga.md) — outbox-based critical path

## Invariants this finished state guarantees

- **One writer per table.** No service (or module) writes another context's
  tables; cross-context reads are APIs or read projections. This is the piece
  that is not yet enforced in the monolith — see
  [`wiki/Table-Ownership.md`](../../wiki/Table-Ownership.md).
- **Public interface = use-cases, not CRUD.** `confirmBooking` /
  `cancelBooking` / `recordRefundSucceeded`, never `updateBookingsByCode`.
  That is the difference between a boundary that survives extraction and a
  repository facade.
- **Domain events cross process boundaries.** Every `DOMAIN_EVENTS` topic (not
  just the integration allowlist) publishes through the `EventPublisher` port
  to NATS, while in-process subscribers keep working locally. Critical
  booking/payment events go through a **transactional outbox** written in the
  same DB transaction and forwarded only after commit.
- **Gateway stays thin.** It authenticates, proxies, and enriches responses; it
  owns no business rules.
- **Migrations per owner.** Each service owns its migrations; `schema:check`
  keeps migrations the source of truth.

## Extraction order

`analytics` → `media` → `notification` → `search` → `catalog` →
`booking + inventory` → `payments` → `identity`.

`services/analytics`, `services/media` and `services/notification` already
exist. `booking + inventory` and `payments` wait for the outbox/saga design in
[booking-payment-saga.md](./booking-payment-saga.md).
