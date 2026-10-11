# S — Admin Bookings

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 1

## Scope

- **Entry points:** `GET /admin/bookings`, `/hotels/:hotelId/stats|trend`, `GET /admin/bookings/:bookingId`, `PATCH /admin/bookings/:bookingId/status`, `POST /admin/bookings/:bookingId/cancel`. UI: `bookings/index`, `bookings/[bookingId]`.
- **Risk focus:** illegal status jumps, cross-hotel access.
- **Environment:** local dev stack, owner/manager/staff seeded, 2026-10-09.

## Review axes

- [ ] UI/UX _(⚠️ admin UI not browser-tested — see [improvements.md](./improvements.md))_
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability _(audit on status change/cancel)_
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| S-API-01 | list bookings (own hotel) | API | 200 | 200 | ✅ | [api.md](./test-results/api.md) |
| S-API-02 | stats | API | 200 | 200 | ✅ | api.md |
| S-API-03 | trend | API | 200 | 200 | ✅ | api.md |
| S-API-04 | get own booking | API | 200 | 200 | ✅ | api.md |
| S-API-05 | **invalid jump** confirmed→completed | Data | 409 | 409 `INVALID_BOOKING_STATUS_TRANSITION` | ✅ | api.md |
| S-API-06 | valid confirmed→checked_in | API | 200 | 200 | ✅ | api.md |
| S-API-07 | invalid status value | API | 400 | 400 | ✅ | api.md |
| S-API-08 | force-cancel own booking | API | 200 | 200 | ✅ | api.md |
| S-API-09 | no token | Security | 401 | 401 | ✅ | api.md |
| S-API-10 | foreign hotel stats | Security | 403 | 403 | ✅ | api.md |
| **S-IDOR-READ** | manager GET **foreign** booking w/ own `X-Hotel-Id` | **Security** | deny | **200** | ❌ | api.md |
| **S-IDOR-WRITE** | manager PATCH **foreign** booking status | **Security** | deny | **200** | ❌ | api.md |
| **S-IDOR-CANCEL** | manager force-cancel **foreign** booking | **Security** | deny | **200** | ❌ | api.md |

## Verdict

- **Status:** 🟡 Partial (S2) — the status state machine and own-hotel flows are correct, but
  `/admin/bookings/:bookingId` (+ `/status`, `/cancel`) **do not verify the booking belongs to
  the hotel context** → cross-hotel read / modify / cancel (S-F1). Not production-ready.
- **Open findings:** S1 _0_ · S2 _1_ · S3 _0_ · S4 _0_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md)
