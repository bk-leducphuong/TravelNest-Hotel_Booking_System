# Modular Monolith

TravelNest's backend (`server/`) is being evolved from a single Express app into a
**modular monolith**: one deployable, but organised into bounded-context modules with
enforced boundaries. Each module is a candidate microservice later; today they are
folders that are *not allowed* to reach into each other's internals.

This page describes the pattern the admin modules follow. It is the reference for
[Review & Moderation](Module-Review), [Inventory](Module-Inventory) and
[Payment & Refunds](Module-Payment).

---

## Why not split by "admin" vs "guest"

Admin vs guest is a **channel**, not a domain. Decomposing by user type produces a
distributed monolith: duplicated business rules or an anemic service that reaches into
every other service's database. Instead:

- **Bounded contexts** own data and rules (review, inventory, payment, catalog, booking…).
- **Admin vs guest is authorization** — the same operations behind different permissions.
- **The admin channel gets a thin BFF** for aggregation and cross-domain composition.

---

## Layers

```
server/
  bff/                     # edge layer (thin) - no domain business rules
    admin/                 # admin channel -> /api/v1/admin/*
  modules/                 # bounded contexts
    <module>/
      domain/              # pure rules/state machines
      application/         # use-cases (application/admin/* for back-office)
      infrastructure/      # models + repositories + adapters
      api/                 # routers/controllers/schemas
      events/              # publishers/subscribers
      index.js             # PUBLIC interface - the only cross-module surface
  platform/                # cross-cutting: events, audit
  models/                  # legacy central registry (now scans module model dirs too)
  shared utils: config, middlewares, utils, constants
```

Dependency direction (enforced by lint):

```
bff → module.application → module.domain → module.infrastructure
```

Cross-module access is **only** through `<module>/index.js` (or via events). The ESLint
`no-restricted-imports` rule for `modules/**` blocks deep imports such as
`@modules/booking/infrastructure/...`.

---

## Model registry

`server/models/index.js` loads Sequelize models from:

1. `server/models/*.model.js` (legacy/core), and
2. `server/modules/*/infrastructure/models/*.model.js`,
3. `server/platform/*/models/*.model.js`.

All models register on the same `db` object, so `db.reviews`, `db.<PascalCase>` and
associations keep working. Modules can therefore own their tables without a central
model file. Model files use **relative requires** (not `@` aliases) because the registry
is also loaded by scripts that don't register aliases (`infra/database/init.js`).

> Schema note: core tables are created by `sequelize.sync({ alter:false })` in
> `infra/database/init.js`. Existing tables are **not altered**, so new columns/tables
> need a real migration under `infra/database/migrations/`.

---

## Platform: events and audit

### Domain event bus (`platform/events`)

A thin in-process `EventEmitter` wrapper (`eventBus.publish/subscribe`) so modules react
to each other without importing internals. It is transport-agnostic and can be swapped
for NATS later. Handler failures are logged and never break the publisher's request.

Known events (see `platform/events/index.js`):

| Event | Emitted by | Consumed by |
|---|---|---|
| `review.created` / `review.status_changed` | Review | Review (rating projection + search snapshot) |
| `inventory.changed` | Inventory | Inventory (search snapshot) |
| `payment.refund_created` / `_succeeded` / `_failed` | Payment | Payment (guest notification) |
| `booking.status_changed` / `booking.cancelled` / `booking.completed` | Booking | Booking (search snapshot on completion) |
| `payout.batch_generated` / `payout.paid` / `payout.failed` | Payout | Payout (owner notifications via payout service) |

Subscribers are registered once per process from each module's `index.js`.

### Audit log (`platform/audit`)

Append-only `audit_logs` table (migration `20260921000000-create-audit-logs-table.js`)
recording sensitive operations: actor, action, entity, hotel context, before/after,
reason, requestId. Recording is best-effort (never breaks the operation) but logged
loudly on failure. Every admin mutation in the modules writes an audit entry.

---

## Admin BFF

`bff/admin/index.js` mounts each module's admin router:

```js
router.use('/reviews', reviewModule.adminRoutes);
router.use('/inventory', inventoryModule.adminRoutes);
router.use('/payments', paymentModule.adminRoutes);
router.use('/bookings', bookingModule.adminRoutes);
router.use('/payouts', payoutModule.adminRoutes);
```

Mounted at `/api/v1/admin`. Auth is Keycloak bearer (`authenticate`) plus per-route
`requirePermission(...)` using the catalog in `constants/permissions.js`. The BFF must
stay thin — it composes, it does not own rules.

### Admin session & hotel context

`GET /api/v1/admin/me` returns the caller's global roles, effective permissions and
managed hotels (from `hotel_users`) — the admin client uses it to gate UI and populate the
hotel switcher.

Hotel-scoped routes use `requirePermission(perm, { requireHotelContext: true })`. The
active hotel comes from the `X-Hotel-Id` header (or `hotelId` param/query/body); platform
staff (`admin`/`support_agent`) may act globally, while owners/managers/staff are
authorised from the **union of their global and hotel-role permissions**
(`helpers/permission.helper.js`).

---

## How to add a module

1. Create `modules/<name>/` with `domain/ application/ infrastructure/ api/ events/ index.js`.
2. Put tables/models under `infrastructure/models/` (registry picks them up).
3. Expose only use-cases from `index.js`.
4. Add `api/admin.routes.js` guarded by `requirePermission`.
5. Mount it in `bff/admin/index.js`.
6. Emit/consume domain events; write audit entries for mutations.
7. Add pure unit tests under `__tests__/unit/modules/<name>/domain/`.

---

## Migration path to services

- **Stage 0 (now):** modular monolith; schema per cohesion cluster (booking + inventory +
  payment share the transactional core).
- **Stage 1:** extract stateless domains first (notification/media/analytics already Go;
  then review, catalog).
- **Stage 2:** extract booking/payment/inventory together with outbox + saga, and split
  guest/admin BFFs.

## Related

- [Booking Admin module](Module-Booking)
- [Review & Moderation module](Module-Review)
- [Inventory admin module](Module-Inventory)
- [Payment & Refunds module](Module-Payment)
- [Payout admin module](Module-Payout)
- [API Reference](API-Reference) · [Database Schema](Database-Schema)
