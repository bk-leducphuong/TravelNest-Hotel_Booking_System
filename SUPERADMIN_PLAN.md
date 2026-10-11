# Superadmin / Platform Monitoring — Implementation Plan

> **Branch:** `feat/superadmin` · **Worktree:** `/home/ubuntu/Personal/TravelNest-superadmin`
> **Base:** `develop` @ `df4074f`
> **Status:** Draft for review · **Owner:** _TBD_

---

## 1. Goal

Give platform operators a **cross-tenant monitoring console** to observe **all hotels,
users, and finances** on TravelNest — one place to see the health of the whole platform,
not just one property.

**Scope for v1: read-only monitoring.** No mutations (no ban/suspend/refund/impersonate).
Actions are deferred to a later phase so the money surface and destructive operations get
their own audited, confirmation-gated design.

---

## 2. Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope | **Read-only monitoring first** |
| 2 | Authorization | **Granular `platform.*` permissions** granted to `admin` and `support_agent` |
| 3 | Frontend | **Separate `superadmin-client/` app** |
| 4 | Backend surface | **Dedicated new DDD module** (named `superadmin`, mounted at `/api/v1/superadmin`) |

### Naming note (important)

`server/platform/` **already exists** as the cross-cutting infrastructure layer
(`audit`, `events`, `health`, `internal`, `realtime`). Do **not** name the new domain module
`platform` — it would collide conceptually and with the model loader in
`server/models/index.js` (which scans `modules/*` **and** `platform/*`).

**Use `server/modules/superadmin/`** with the `platform.*` **permission prefix** and the
`/api/v1/superadmin` **mount**. This yields three clearly distinct planes:

| Plane | Path | Audience | Auth |
|-------|------|----------|------|
| Ops / backdoor | `/api/v1/internal/superadmin/*` | CI, operators | `INTERNAL_SUPERADMIN_TOKEN` or admin role |
| Hotel back-office | `/api/v1/admin/*` | owners/managers/staff | Keycloak + hotel-scoped `requirePermission` |
| **Platform console (new)** | **`/api/v1/superadmin/*`** | **admin / support_agent** | **Keycloak + `platform.*` `requirePermission`** |

### Internal ops routes stay put

`server/platform/internal/api/internalSuperadmin.routes.js` (DB init, seeders,
Elasticsearch/Mongo seeding, test notifications) is **operator/infra tooling**,
not product monitoring. It stays in `server/platform/internal/` and is **not**
moved into this module — merging it would put an arbitrary-script-execution
surface behind the console's UI and permission model, and expose the token
backdoor to a browser SPA.

Follow-ups (separate from this feature):

- Delete the redundant commented `// requireInternalSuperadmin,` lines on the
  notification routes (the router-level `router.use` already covers them).
- Require the configured **token** (not an `admin` bearer session) for the
  destructive ops routes (`database/init`, `*/seeders/*`, `elasticsearch/*`,
  `mongodb/*`). Today an `admin` browser token can trigger them.

---

## 3. What already exists (reuse — do not rebuild)

| Capability | Location |
|-----------|----------|
| RBAC tables (`roles`, `permissions`, `role_permissions`, `user_roles`, `hotel_users`) | `server/modules/identity/infrastructure/models/` |
| Authz middleware (`authenticate`, `requirePermission`, hotel context) | `server/middlewares/auth.middleware.js` |
| Global roles (`guest`, `user`, `admin`, `support_agent`) + hotel roles | `server/constants/roles.js` |
| Permission constants + role mapping | `server/constants/permissions.js` |
| Permission seeder | `server/seeders/database/permission.seed.js` |
| Admin BFF | `server/bff/admin/` |
| Audit trail (append-only, actor/before/after/reason/request_id) | `server/platform/audit/` |
| Realtime admin metrics namespace | `server/platform/realtime/namespaces/admin/` |
| Analytics module + Mongo (`search_logs`, `hotel_view_events`) + ClickHouse | `server/modules/analytics/`, `services/analytics/` |
| Global model registry (`db.<table>` for all module models) | `server/models/index.js` |

**Key facts that shape the design:**

- `admin` role currently **bypasses every permission check** (`isPlatformAdmin` short-circuit
  in `requirePermission`). `support_agent` is permission-gated.
- `ROLE_PERMISSIONS.admin = Object.values(PERMISSIONS)` → new `platform.*` permissions are
  auto-granted to `admin`; `support_agent` needs an explicit list update.
- The existing admin client is **single-tenant**: `services/http.ts` sends `X-Hotel-Id`, the
  layout has a hotel switcher, and hotel-scoped routes *require* hotel context. Platform
  monitoring has **no hotel context** — hence the separate app.
- Models from every module are registered on one `db` object, so the new module's
  repositories can read `db.hotels`, `db.users`, `db.bookings`, `db.payments`, etc.

---

## 4. Architecture overview

```
                    ┌─────────────────────────────────────────┐
   Keycloak  ──────▶│  superadmin-client (Nuxt 4 SPA)          │
   (bearer)         │  /overview /hotels /users /finance /audit│
                    └───────────────────┬─────────────────────┘
                                        │ Bearer token (no X-Hotel-Id)
                                        ▼
                    ┌─────────────────────────────────────────┐
                    │  /api/v1/superadmin/*  (BFF edge)        │
                    │  requirePermission('platform.*.read')    │
                    └───────────────────┬─────────────────────┘
                                        │
                    ┌───────────────────▼─────────────────────┐
                    │  server/modules/superadmin/             │
                    │  api → application → infrastructure     │
                    └───────┬───────────────────┬─────────────┘
                            │                   │
                  MySQL (drill-down)     Analytics service /
                  via repositories       ClickHouse / Mongo
                                         (aggregates)
```

---

## 5. Backend

### 5.1 Module layout

```
server/modules/superadmin/
  api/
    superadmin.routes.js        # router.use(authenticate) + requirePermission per route
    superadmin.controller.js    # thin HTTP handlers
    superadmin.schema.js        # Joi validators (params/query/body)
  application/
    overview.service.js         # KPI aggregation / dashboards
    hotel-admin.service.js      # platform-wide hotel reads
    user-admin.service.js       # platform-wide user reads (+ PII masking)
    finance-admin.service.js    # payments/refunds/payouts/ledger reads (Phase 2)
    audit.service.js            # read wrapper over platform/audit
    pii.js                      # masking helper
  infrastructure/
    superadmin.repository.js    # Sequelize reads via global `db`
    analytics.client.js         # aggregates from analytics service (Phase 1)
  index.js                      # exports { superadminRoutes }
```

### 5.2 Mount

`server/routes/v1/index.js`:

```js
const superadminModule = require('@modules/superadmin');
// ...
router.use('/superadmin', superadminModule.superadminRoutes);
```

> Keep it mounted **after** `authLimiter`/`writeLimiter` decisions are made; monitoring is
> read-only so the global limiter applies. Consider a dedicated limiter for aggregate
> endpoints (see §7.5).

### 5.3 Permissions to add

Add to `server/constants/permissions.js`:

```js
// ============ PLATFORM (cross-tenant monitoring) ============
PLATFORM_HOTEL_READ:   'platform.hotel.read',
PLATFORM_USER_READ:    'platform.user.read',
PLATFORM_USER_PII_READ:'platform.user.pii_read',   // unmasked PII
PLATFORM_FINANCE_READ: 'platform.finance.read',
PLATFORM_AUDIT_READ:   'platform.audit.read',
PLATFORM_OVERVIEW_READ:'platform.overview.read',
```

Descriptions in `PERMISSION_DESCRIPTIONS`, and role grants in `ROLE_PERMISSIONS`:

```js
// support_agent — view-only platform monitoring (explicit list)
support_agent: [
  /* ...existing... */
  PERMISSIONS.PLATFORM_OVERVIEW_READ,
  PERMISSIONS.PLATFORM_HOTEL_READ,
  PERMISSIONS.PLATFORM_USER_READ,
  PERMISSIONS.PLATFORM_FINANCE_READ,
  PERMISSIONS.PLATFORM_AUDIT_READ,
  // NOTE: NOT PLATFORM_USER_PII_READ — support sees masked data only.
],

// admin is already Object.values(PERMISSIONS) → gets everything automatically.
```

Then `yarn workspace @travelnest/server seed:permission` (idempotent `findOrCreate`).

### 5.4 Endpoint surface — Phase 1 (read-only, all `GET`)

| Endpoint | Permission | Purpose |
|----------|-----------|---------|
| `GET /superadmin/overview` | `platform.overview.read` | KPI cards: hotels by status, users, bookings, GMV, refunds, payouts |
| `GET /superadmin/hotels` | `platform.hotel.read` | Paginated cross-tenant hotel list (filters: status, city, owner, search) |
| `GET /superadmin/hotels/:hotelId` | `platform.hotel.read` | Hotel detail: owner(s), rooms, recent bookings, revenue, rating |
| `GET /superadmin/users` | `platform.user.read` | Paginated user list (filters: status, role, search) |
| `GET /superadmin/users/:userId` | `platform.user.read` | User detail: memberships, bookings, payments (**PII masked**) |
| `GET /superadmin/audit` | `platform.audit.read` | Audit-log browser (actor, action, entity, date range) |

Phase 2 adds `GET /superadmin/finance/{overview,payments,refunds,payouts,ledger}` under
`platform.finance.read`.

### 5.5 Route pattern (follow `catalog/api/admin.routes.js`)

```js
const express = require('express');
const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');
const schema = require('./superadmin.schema');
const controller = require('./superadmin.controller');

const router = express.Router();
router.use(authenticate);

router.get(
  '/overview',
  requirePermission(PERMISSIONS.PLATFORM_OVERVIEW_READ),
  controller.getOverviewHandler
);

router.get(
  '/hotels',
  requirePermission(PERMISSIONS.PLATFORM_HOTEL_READ),
  validate(schema.listHotels),
  controller.listHotelsHandler
);

// ... hotels/:hotelId, users, users/:userId, audit

module.exports = router;
```

> **No `requireHotelContext: true` here** — these routes are platform-scoped and must NOT
> depend on `X-Hotel-Id`.

### 5.6 Data / aggregation strategy

- **Aggregates** (`/overview`, list counts) → prefer the **analytics service / ClickHouse /
  Mongo** (`services/analytics`, `modules/analytics`). Do **not** run unbounded
  cross-tenant joins on MySQL per request.
- **Drill-down** (single hotel/user/payment) → MySQL via `infrastructure/superadmin.repository.js`
  using the global `db` object.
- Add indexes if a list query is hot (`hotels.status` already indexed; check `users.status`,
  `bookings.created_at`).
- Cache expensive overview aggregates in Redis with a short TTL if needed.

---

## 6. Frontend — `superadmin-client/`

### 6.1 Scaffold

- New workspace `superadmin-client/` added to root `package.json` `workspaces`.
- Clone/adapt from `admin-client/`:
  - `nuxt.config.ts` (SPA `ssr: false`, Tailwind, Element Plus, Pinia, `devServer.port` **8100**)
  - `services/keycloak.ts`, `services/http.ts` (drop the `X-Hotel-Id` logic)
  - `stores/auth.ts` (no `hotels`/`activeHotelId`; keep `globalRoles`, `permissions`)
  - `composables/usePermissions.ts` (platform-only permission checks)
  - `layouts/` — a single layout **without** the hotel switcher
  - Vitest + Playwright + ESLint + Prettier config
- Pages: `overview.vue`, `hotels/index.vue`, `hotels/[hotelId].vue`, `users/index.vue`,
  `users/[userId].vue`, `finance/*` (Phase 2), `audit/index.vue`, `login.vue`.
- `middleware/auth.global.ts` — require authentication **and** a platform role
  (`admin`/`support_agent`); otherwise redirect to login / show 403.

### 6.2 Keycloak

- New public client `travelnest-superadmin` in the realm (PKCE S256).
- Redirect URIs / web origins for the new host.
- Runtime config: `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_KEYCLOAK_URL`,
  `NUXT_PUBLIC_KEYCLOAK_REALM`, `NUXT_PUBLIC_KEYCLOAK_CLIENT_ID`.

### 6.3 Build / CI / deploy

- `.github/workflows/superadmin-client.yml` (mirror `admin-client.yml`).
- `superadmin-client/Dockerfile` + `nginx/` config.
- `deploy/k8s/` manifests + Argo CD app; DNS entry (e.g. `superadmin.deployserver.work`).
- Root scripts: `dev:superadmin`, `build:superadmin`.

> **Cost awareness:** a separate app duplicates ~60% of the plumbing (auth, HTTP client,
> permissions, build/CI/deploy). This is the trade for isolation. If the recurring
> maintenance becomes painful, folding it back into `admin-client` as a "Platform" section
> is the fallback.

---

## 7. Security requirements (non-negotiable for v1)

1. **Fix the shared ownership guard first.** `docs/plan/phase_1/README.md` documents systemic
   IDOR (R-F1 / S-F1 / T-F1): admin routes scoped by entity id authorize against `X-Hotel-Id`
   only and don't verify entity ownership. Platform cross-tenant detail views amplify this.
   Implement one shared ownership guard and apply it to entity-detail reads.
2. **Granular permissions, not the admin bypass.** Every platform route gates on a named
   `platform.*` permission. `support_agent` gets read-only; `admin` retains the bypass but
   routes still declare the permission for clarity and future tightening.
3. **PII masking by default.** `application/pii.js` masks email/phone/address unless the
   caller holds `platform.user.pii_read`. Log every PII access to the audit trail.
4. **Audit read/write actions.** Read-only v1 still records *access* to sensitive PII in
   `platform/audit`. All Phase 3 mutations use `auditService.recordFromRequest` with a
   required `reason`.
5. **Rate-limit and bound aggregates.** Add a dedicated limiter for `/superadmin/overview`
   and paginate all lists (default 20, max 100).
6. **Never use the internal ops token for the UI.** The console authenticates with Keycloak
   bearer + platform role only. `INTERNAL_SUPERADMIN_TOKEN` stays for CI/operators.
7. **No secrets/PII in logs.** Reuse the existing logger redaction; never log tokens or raw
   PII.

---

## 8. Phasing & task list

### Phase 0 — Foundations
- [x] Create `server/modules/superadmin/` skeleton (`api` / `application` / `infrastructure` / `index.js`)
- [x] Add `platform.*` permissions to `constants/permissions.js` + descriptions + role grants
- [x] Verify grants for `admin` and `support_agent` (unit test; run the seeder in a real env)
- [x] Mount `/api/v1/superadmin` in `server/routes/v1/index.js`
- [x] Shared **ownership guard** helper (`helpers/ownership.helper.js`)
- [ ] Roll the ownership guard out to the legacy admin entity-detail routes (R-F1/S-F1/T-F1)
- [x] `application/pii.js` masking helper
- [ ] Record PII access in the audit trail
- [x] `superadmin-client/` scaffold: workspace, Nuxt config, auth/http/permissions, layout, middleware, CI, Docker/nginx
- [ ] Keycloak client + DNS + k8s/Argo CD manifests (provisioning)
- [ ] Internal ops API hardening: token-only for destructive routes, drop dead guard comments (D7)

### Phase 1 — Read-only monitoring
- [x] `GET /superadmin/overview`
- [x] `GET /superadmin/hotels` + `GET /superadmin/hotels/:hotelId`
- [x] `GET /superadmin/users` + `GET /superadmin/users/:userId` (PII masked)
- [x] `GET /superadmin/audit`
- [x] Frontend pages for the above
- [x] Joi schemas + unit tests per service (hotel/user admin, controller PII wiring)
- [ ] Integration test: support_agent can read, cannot read PII unmasked; non-platform user gets 403

> **Progress:** Phase 0 and Phase 1 implemented in the `feat/superadmin` worktree
> (commit `c444d41` + Phase 1). Backend unit suite 374/374; superadmin-client unit tests
> 12/12 and `nuxt build` green. Overview aggregates still read MySQL counts directly —
> move to the analytics service when the finance KPIs land.

### Phase 2 — Finances (read-only)
- [ ] `GET /superadmin/finance/{overview,payments,refunds,payouts,ledger}`
- [ ] Frontend finance pages
- [ ] Reconciliation view + tests

### Phase 3 — Actions (separate plan)
- [ ] `platform.hotel.suspend`, `platform.user.ban`, `platform.finance.refund`
- [ ] Confirmation UX + mandatory reason + audit
- [ ] Maker/checker for money movement

---

## 9. Testing & verification

| Change | Command |
|--------|---------|
| Backend service/repository | `yarn workspace @travelnest/server test:unit` |
| Backend API/DB flow | `yarn workspace @travelnest/server test:integration` |
| Permission seeding | run seeder + assert `role_permissions` rows |
| Frontend unit | `yarn workspace @travelnest/superadmin-client test:unit` |
| Frontend types | `yarn workspace @travelnest/superadmin-client typecheck` |
| Frontend E2E | `yarn workspace @travelnest/superadmin-client test:e2e` |
| Cross-package | `yarn lint` |

Follow existing Jest (backend) and Vitest/Playwright (frontend) conventions. Add authz tests
explicitly covering the `support_agent` (masked) vs `admin` (unmasked) PII boundary.

---

## 10. Open questions / risks

1. **Aggregate source:** analytics service/ClickHouse vs MySQL summary tables — confirm what
   is production-ready for GMV/refund/payout KPIs.
2. **User PII scope:** which fields count as PII, and whether reads should be logged for all
   users or only `pii_read` unmasking.
3. **Deploy/DNS + Keycloak realm ownership:** who provisions the client, redirect URIs, and
   `superadmin.deployserver.work`.
4. **Ownership guard blast radius:** fixing the systemic IDOR touches existing admin routes
   (R/S/T) — coordinate to avoid regressions.
5. **Separate app vs section:** revisit after Phase 1 if plumbing maintenance outweighs the
   isolation benefit.

---

## 11. Deferred work / open issues (implementation backlog)

Items intentionally left out of Phases 0–1, each with enough context to pick up later.

### D1 — Roll the ownership guard into legacy admin routes (security)
- **Context:** systemic cross-hotel IDOR (R-F1 / S-F1 / T-F1 in
  `docs/plan/phase_1/README.md`). Admin routes scoped by entity id authorize against
  `X-Hotel-Id` only and never verify the entity belongs to that hotel.
- **Have:** `server/helpers/ownership.helper.js` (`assertEntityBelongsToHotel`,
  `assertHotelScopedAccess`) — created and unit-tested, but **not yet used**.
- **Do:** resolve the entity first, then call the guard, on the entity-detail routes in
  `modules/catalog` (`/rooms/:roomId`), `modules/booking` (`/bookings/:bookingId`),
  `modules/payment` (`/payments/transactions/:transactionId`), and the payout equivalents.
- **Accept:** cross-hotel entity id returns 404; same-hotel still works; regression tests
  added. Coordinate the blast radius before merging.

### D2 — Record PII access in the audit trail (security)
- **Context:** §7.3 requires logging reads of sensitive PII; not implemented.
- **Do:** in the superadmin controller/service, when `platform.user.pii_read` is exercised
  (or on any user-detail read), call `auditService.recordFromRequest` with
  `action: 'platform.user.pii_read'`, `entityType: 'user'`, `entityId`, and the actor.
- **Accept:** an audit row is written per PII read; best-effort (never breaks the read).

### D3 — Integration test for the authz / PII boundary
- **Context:** unit tests cover the service and controller wiring, but no DB-backed test.
- **Do:** add under `server/__tests__/integration` (Testcontainers): `support_agent` can read
  hotels/users but sees masked PII; `admin` sees unmasked; a non-platform user gets 403;
  a request without a `platform.*` permission gets 403.
- **Accept:** runs in CI when Docker is available.

### D4 — Move overview aggregates to the analytics service
- **Context:** `GET /superadmin/overview` currently runs `COUNT(*)` queries directly against
  MySQL (`superadmin.repository.getPlatformOverview`).
- **Do:** source platform KPIs (and later GMV/refund/payout) from the analytics service /
  ClickHouse / summary tables; cache in Redis with a short TTL.
- **Accept:** overview no longer issues per-status count queries on the primary DB.

### D5 — Rate-limit the aggregate endpoints
- **Context:** §7.5. `/superadmin/overview` is unbounded-ish and expensive.
- **Do:** add a dedicated limiter for the superadmin router (or at least `/overview`) and
  confirm all lists stay paginated (already default 20, max 100).
- **Accept:** burst requests to `/overview` are throttled.

### D6 — Keycloak client + DNS + k8s/Argo CD
- **Context:** the app scaffold, Dockerfile, nginx and CI workflow exist; the runtime
  provisioning does not.
- **Do:** create the public Keycloak client `travelnest-superadmin` (PKCE S256) with redirect
  URIs/web origins; add `deploy/k8s/` manifests + an Argo CD app; add a DNS entry
  (`superadmin.deployserver.work`); set the `NUXT_PUBLIC_*` repo variables used by
  `.github/workflows/superadmin-client.yml`.
- **Accept:** the console is reachable in an environment and can complete a login.

### D7 — Internal ops API hardening (separate from this feature)
- **Context:** see §2 "Internal ops routes stay put".
- **Do:** (a) delete the redundant commented `// requireInternalSuperadmin,` lines in
  `platform/internal/api/internalSuperadmin.routes.js`; (b) require the configured **token**
  (not an `admin` bearer session) for the destructive ops routes (`database/init`,
  `*/seeders/*`, `elasticsearch/*`, `mongodb/*`).
- **Accept:** an `admin` browser session can no longer trigger seeders / DB init.

### D8 — Frontend typecheck / ESLint tooling
- **Context:** `superadmin-client` mirrors `admin-client`, which does not declare
  `typescript` as a devDependency — so `eslint`/`vue-tsc` fail locally and CI marks them
  `continue-on-error`.
- **Do:** add `typescript` to devDependencies, fix any resulting type errors, then remove the
  `continue-on-error` flags in `.github/workflows/superadmin-client.yml`.
- **Accept:** `typecheck` and `lint` pass in CI.

### D9 — superadmin-client E2E coverage
- **Context:** Playwright is configured but no specs exist.
- **Do:** add `tests/e2e` specs for the login → `/403` (non-platform) and login → overview
  (platform) flows, mirroring `admin-client/tests/e2e`.
- **Accept:** E2E runs against a seeded environment.
