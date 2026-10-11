# O — Admin Auth, Session & RBAC

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 0

## Scope

- **Entry points:** `GET /admin/me` (BFF), Keycloak bearer auth, `requirePermission(perm, {requireHotelContext})` / `requireHotelPermission`, `X-Hotel-Id` hotel context. Admin UI: Nuxt auth store, `middleware/auth.global.ts`, `usePermissions`, `Can.vue`, hotel switcher.
- **Risk focus:** privilege escalation, missing `requireHotelPermission`, cross-hotel access.
- **Environment:** local dev stack (API :3000, admin :8000, Keycloak :8080), roles seeded (`Test@1234`), 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| O-ME-* | `/admin/me` for admin/support/owner/manager/staff/guest | API | 200 + roles/perms/hotels | 200 | ✅ | [api.md](./test-results/api.md) |
| O-API-01/02 | admin routes no token | Security | 401 | 401 | ✅ | api.md |
| O-API-03 | `/admin/bookings` (admin) | API | 200 | 200 | ✅ | api.md |
| O-API-04/05 | `/admin/bookings`,`/payouts` (guest) | Security | 403 | **400** (hotel ctx) | ⚠️ | api.md |
| O-API-07 | manager/staff rooms **own** hotel | Security | 200 | 200 | ✅ | notes.md |
| O-API-08 | manager rooms **foreign** hotel | Security | 403 | 403 | ✅ | notes.md |
| O-SEC-01 | manager create room (has `room.create`) | Security | 201 | 201 | ✅ | notes.md |
| O-SEC-02 | staff create room (no `room.create`) | Security | 403 | 403 | ✅ | notes.md |
| O-SEC-03 | staff payouts (no `payment.read`) | Security | 403 | 403 | ✅ | notes.md |
| O-SEC-04 | support bookings/payouts (platform staff, no hotel ctx) | Security | 200 | 200 | ✅ | notes.md |
| **O-SEC-05** | **guest `GET /admin/hotels` (catalog list)** | **Security** | deny | **200 (20 hotels)** | ❌ | notes.md |
| O-SEC-06 | guest `GET /admin/hotels/:id` (scoped) | Security | 403 | 403 | ✅ | notes.md |
| O-UI-01 | admin guard + empty states | UI/UX | guard + messages | redirect/empty states OK | ✅ | [browser.md](./test-results/browser.md) |
| O-UI-02 | `usePermissions` mirrors server (platform vs hotel role) | UI/UX | correct | correct (code) | ✅ | browser.md |

## Verdict

- **Status:** 🟡 Partial — RBAC enforcement is **strong** (hotel scoping, cross-hotel 403,
  per-permission gating, platform-staff globals all correct). One gap: the **admin catalog list
  is reachable by any guest** (O-F1). Not production-ready until that is tightened.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _1_ · S4 _2_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md, browser.md)
