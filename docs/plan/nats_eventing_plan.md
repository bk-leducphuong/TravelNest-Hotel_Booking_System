# NATS Eventing Plan

## Choice

Use NATS JetStream, not plain core NATS.

JetStream is needed for:

- Durable consumers
- Message replay
- Retry behavior
- At-least-once delivery
- Backpressure
- Dead-letter handling
- Service restarts without event loss

## Docker Compose Service

```yaml
nats:
  image: nats:2.10-alpine
  command: ["-js", "-m", "8222"]
  ports:
    - "4222:4222"
    - "8222:8222"
```

## Event Envelope

All domain events should use a consistent envelope:

```json
{
  "eventId": "uuid",
  "eventType": "analytics.search.performed.v1",
  "version": 1,
  "occurredAt": "2026-06-01T10:30:00Z",
  "producer": "travelnest-api",
  "correlationId": "request-or-trace-id",
  "idempotencyKey": "optional-key",
  "payload": {}
}
```

## Subject Naming

Use subject names that include domain, event, and version:

```text
analytics.search.performed.v1
analytics.hotel.viewed.v1
catalog.hotel.created.v1
catalog.hotel.updated.v1
catalog.room.updated.v1
catalog.amenity.changed.v1
booking.hold.created.v1
booking.hold.expired.v1
booking.booking.created.v1
booking.booking.confirmed.v1
booking.booking.cancelled.v1
booking.booking.expired.v1
payment.payment.succeeded.v1
payment.payment.failed.v1
payment.refund.created.v1
notification.email.requested.v1
```

## Initial Streams

Start with one stream for simplicity:

```text
TRAVELNEST_EVENTS
subjects: *.>
storage: file
retention: limits
```

If event volume grows, split later:

```text
TRAVELNEST_ANALYTICS
subjects: analytics.>

TRAVELNEST_DOMAIN
subjects: catalog.>, booking.>, payment.>, notification.>
```

## Consumer Rules

Every consumer must:

- Use a durable name.
- Decode and validate the event envelope.
- Reject unsupported versions.
- Be idempotent using `eventId` or domain-specific unique keys.
- Ack only after successful processing.
- Treat duplicate-key inserts as success.
- Retry temporary infrastructure failures.
- Send poison messages to a dead-letter subject after max deliveries.

## Node Publisher

Add a Node NATS publisher module in the existing server.

Responsibilities:

- Connect to NATS on app startup.
- Publish JSON events.
- Include `eventId`, `occurredAt`, `producer`, and `correlationId`.
- Flush publishes where request correctness depends on the event.
- Log publish failures.

For non-critical analytics events, failed publish should not break user-facing requests.

## Outbox Policy

Use direct publish first for analytics because it is non-critical.

For critical events such as booking/payment:

- Add a MySQL transactional outbox table.
- Write domain data and outbox event in the same DB transaction.
- Run an outbox publisher that forwards events to NATS.
- Mark outbox rows as published only after NATS ack.

