# R — Admin Inventory / Availability

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 1

## Scope

- **Entry points:** `GET /admin/inventory/hotels/:hotelId/rooms`, `/occupancy`, `GET/PATCH /admin/inventory/rooms/:roomId` (bulk allotment/price/status). UI: `availability/index`.
- **Risk focus:** oversell from a bad bulk edit.
- **Environment:** local dev stack, owner/manager/staff seeded, 2026-10-09.

## Review axes

- [ ] UI/UX _(⚠️ admin UI not browser-tested — see [improvements.md](./improvements.md))_
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability _(audit + `inventory.changed` event)_
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| R-API-01 | hotel inventory rooms | API | 200 | 200 | ✅ | [api.md](./test-results/api.md) |
| R-API-02 | room inventory range | API | 200 | 200 (per-day rows) | ✅ | api.md |
| R-API-03 | occupancy | API | 200 | 200 | ✅ | api.md |
| R-API-04 | patch range (owner) | API | 200 | 200 | ✅ | api.md |
| R-API-05 | patch entries[] | API | 200 | 200 | ✅ | api.md |
| R-API-06 | patch (staff, `room.manage_inventory`) | API | 200 | 200 | ✅ | api.md |
| R-API-07 | **oversell guard** (totalRooms < booked) | Data | 409 | 409 `INVENTORY_BELOW_BOOKED` | ✅ | api.md |
| R-API-08 | invalid status | API | 400 | 400 | ✅ | api.md |
| R-API-09 | range > 366 days | API | 400 | 400 | ✅ | api.md |
| R-API-10 | no startDate/entries | API | 400 | 400 | ✅ | api.md |
| R-API-12 | no token | Security | 401 | 401 | ✅ | api.md |
| **R-API-13** | **IDOR: manager patches FOREIGN room w/ OWN X-Hotel-Id** | **Security** | deny | **200** | ❌ | api.md |
| R-API-14 | foreign hotel context | Security | 403 | 403 | ✅ | api.md |
| **R-IDOR-READ** | **manager reads FOREIGN room inventory w/ OWN X-Hotel-Id** | **Security** | deny | **200 (returns foreign room)** | ❌ | notes.md |

## Verdict

- **Status:** 🟡 Partial — the bulk-edit rules, oversell guard, validation and audit are solid,
  but **`/admin/inventory/rooms/:roomId` has a cross-hotel IDOR** (read + write) — R-F1, S2.
  Not production-ready until the target room is verified to belong to the hotel context.
- **Open findings:** S1 _0_ · S2 _1_ · S3 _0_ · S4 _1_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md)
