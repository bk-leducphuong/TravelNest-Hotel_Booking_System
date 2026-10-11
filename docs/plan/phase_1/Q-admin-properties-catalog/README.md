# Q — Admin Properties / Catalog

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 3

## Scope

- **Entry points:** `GET /admin/hotels`, `GET/PATCH /admin/hotels/:hotelId`, rooms CRUD (`/admin/hotels/:hotelId/rooms[/:roomId]`), policies CRUD (`/admin/hotels/:hotelId/policies[/:policyId]`). UI: `properties/index`, `properties/[hotelId]`.
- **Risk focus:** cross-hotel edit (IDOR), missing `HOTEL_UPDATE` gate.
- **Environment:** local dev stack (API :3000, admin :8000), owner/manager/staff seeded, 2026-10-09.

## Review axes

- [ ] UI/UX _(⚠️ admin UI not browser-tested — see [improvements.md](./improvements.md); guest-visible list gap in O)_
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
| Q-API-01 | get own hotel | API | 200 | 200 | ✅ | [api.md](./test-results/api.md) |
| Q-API-02 | get foreign hotel | Security | 403 | 403 | ✅ | api.md |
| **Q-API-03/04** | **patch own hotel (owner/manager)** | API | 200 | **500** | ❌ | api.md |
| Q-API-05 | patch hotel (staff, no `hotel.update`) | Security | 403 | 403 | ✅ | api.md |
| Q-API-06 | patch foreign hotel | Security | 403 | 403 | ✅ | api.md |
| Q-API-07 | patch invalid hotelClass | API | 400 | 400 | ✅ | api.md |
| Q-API-08 | list rooms | API | 200 | 200 | ✅ | api.md |
| Q-API-09 | create room | API | 201 | 201 | ✅ | api.md |
| Q-API-10 | update room | API | 200 | 200 | ✅ | api.md |
| Q-API-11 | create room missing name | API | 400 | 400 | ✅ | api.md |
| Q-API-12 | delete room | API | 200 | 200 | ✅ | api.md |
| Q-API-13 | list policies | API | 200 | 200 | ✅ | api.md |
| Q-API-14 | create policy | API | 201 | 201 | ✅ | api.md |
| Q-API-15 | update policy | API | 200 | 200 | ✅ | notes.md |
| Q-API-16 | create policy invalid type | API | 400 | 400 | ✅ | api.md |
| Q-API-17 | delete policy | API | 200 | 200 | ✅ | notes.md |
| Q-API-18 | owner foreign rooms | Security | 403 | 403 | ✅ | api.md |
| Q-API-19 | no token | Security | 401 | 401 | ✅ | api.md |
| Q-API-20 | staff create room (no `room.create`) | Security | 403 | 403 | ✅ | api.md |
| **Q-TZ** | **patch hotel with `Asia/Ho_Chi_Minh`** | API | 400 | **500** | ❌ | notes.md |

## Verdict

- **Status:** 🟡 Partial — rooms/policies CRUD, cross-hotel denial and permission gating are
  all correct, but **`PATCH /admin/hotels/:id` 500s on an unlisted timezone** (Q-F1) and the
  timezone allowlist **omits `Asia/Ho_Chi_Minh`** (Q-F2). Not production-ready until fixed.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _2_ · S4 _0_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md)
