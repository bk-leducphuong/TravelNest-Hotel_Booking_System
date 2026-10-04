# Booking → Payment Saga

The critical path for the coupled transactional core (`booking + inventory`
and `payments`). It uses a per-service transactional outbox so domain data and
the event that announces it commit atomically, and every consumer is idempotent
by `eventId`.

```mermaid
sequenceDiagram
  autonumber
  participant U as Guest
  participant B as booking+inventory
  participant BDB as Booking DB
  participant OB as Outbox publisher
  participant N as NATS JetStream
  participant P as payments/ledger
  participant PDB as Payments DB

  U->>B: POST /api/v1/bookings
  B->>BDB: TX { booking + outbox(booking.booking.created.v1) }
  BDB-->>B: commit
  B-->>U: 201 booking (pending payment)

  loop poll unpublished
    OB->>BDB: claim outbox rows
    OB->>N: publish booking.booking.created.v1
    N-->>OB: ack
    OB->>BDB: mark published
  end

  N->>P: deliver (durable, idempotent by eventId)
  P->>PDB: TX { payment intent + outbox(payment.payment.intent_created.v1) }
  P-->>N: ack

  N->>B: deliver payment.payment.succeeded.v1
  B->>BDB: confirm booking + reserve inventory (idempotent)
```

## Why this shape

- **Outbox, not direct publish.** A publish that happens outside the DB
  transaction can be lost (or a rollback can leave a phantom event). Writing the
  event in the same transaction and forwarding it afterward gives
  at-least-once delivery with a replayable source of truth.
- **Idempotent consumers.** Duplicate-key inserts count as success; consumers
  ack only after processing and use `eventId` (or a domain key) to dedupe.
- **No cross-service writes.** Payment never updates booking rows; it emits an
  event and booking applies it. This is what lets the two be extracted
  independently.
- **Durable consumers + dead-letter.** Poison messages go to a dead-letter
  subject after max deliveries; processing is observable.

This design is the prerequisite for steps 6 and 7 of
`plan/service_extraction_order.md`.
