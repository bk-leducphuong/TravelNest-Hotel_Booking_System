# TravelNest Go Microservices Migration Plan

## Goal

Migrate TravelNest from a Node.js/Express monolith toward Go-based microservices with NATS domain events, while keeping the existing frontend API stable during the transition.

This system is for testing and learning, so the migration can be more aggressive than a production-safe strangler migration. Temporary shared database access, short-lived duplicate code paths, and early service extraction are acceptable.

## Target Architecture

- Keep the current Node.js backend as an API gateway/BFF during migration.
- Add new Go services under `services/`.
- Use NATS JetStream for durable domain events.
- Keep MySQL, MongoDB, Redis, Elasticsearch, and MinIO initially.
- Allow temporary shared reads from existing databases.
- Move writes to the owning service as each service becomes stable.
- Preserve frontend routes and response shapes until the frontend is intentionally changed.

## Proposed Service Layout

```text
services/
  analytics/
  media/
  notifications/
  search/
  catalog/
  booking/
  payments/
  identity/
```

## Migration Principles

- Extract one deployable service at a time.
- Start with async/high-volume/low-risk services.
- Prefer REST APIs first for simpler learning and Node proxy integration.
- Use NATS events for cross-service communication.
- Use idempotent consumers for every event handler.
- Accept eventual consistency for analytics, search projections, media processing, email, and notifications.
- Avoid splitting booking/payment/inventory first, because those flows currently depend on shared transactional writes.

## Node Monolith Role During Migration

The Node backend should gradually become a compatibility layer:

- Continue serving existing `/api/v1/*` routes.
- Publish domain events to NATS.
- Proxy selected route groups to Go services as they are extracted.
- Enrich responses where needed, for example analytics returns hotel IDs and Node loads hotel cards from MySQL.
- Remove old Node modules only after the Go service has parity.

## Recommended Migration Flow

1. Add NATS JetStream infrastructure.
2. Add a small Node NATS publisher module.
3. Extract Analytics Service in Go.
4. Replace BullMQ analytics workers with NATS consumers.
5. Extract Media Service.
6. Extract Notification Service.
7. Extract Search Service.
8. Extract Catalog Service.
9. Extract Booking/Inventory Service.
10. Extract Payment/Ledger Service.
11. Extract Identity/User Service.

## Temporary Shared Database Policy

During learning migration:

- Go services may read existing MySQL tables directly when it speeds migration.
- New writes should move to the service that owns the domain.
- Analytics owns MongoDB analytics collections from the beginning.
- Search can temporarily read MySQL availability data before building owned projections.
- Checkout/payment tables should remain in the monolith until the booking/payment split is explicitly redesigned.

## Acceptance Criteria

- Existing frontend behavior remains usable.
- Each extracted service has health checks.
- Each event consumer is idempotent.
- Events can be replayed safely.
- Failed event processing is observable.
- Old Node workers/routes are removed only after replacement behavior is verified.

