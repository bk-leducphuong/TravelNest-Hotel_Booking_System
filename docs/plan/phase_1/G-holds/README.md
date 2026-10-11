# G — Holds

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 1

## Scope

- **Entry points:** `POST /hold`, `GET /hold`, `GET /hold/:holdId`, `DELETE /hold/:holdId`; hold-expiry BullMQ job. UI: `HotelDetails` ("Tôi sẽ đặt" → create hold), `Book` (checkout; release on abandon).
- **Risk focus:** inventory leak/oversell.
- **Environment:** local dev stack (API :3000, client :5173), authenticated as Test User, 2026-10-09. Hold TTL 15 min.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [x] Performance
- [x] Observability
- [ ] Infra dependency _(expiry worker runs; not observed firing)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| G-API-01 | create hold | API | 201 | 201 (holdId, totalPrice, status, expiresAt) | ✅ | [api.md](./test-results/api.md) |
| G-API-02 | list holds | API | 200 | 200 | ✅ | api.md |
| G-API-03 | get hold by id | API | 200 | 200 | ✅ | api.md |
| G-API-04 | create no token | Security | 401 | 401 | ✅ | api.md |
| G-API-05 | user B get A's hold | Security | deny | **403 FORBIDDEN** | ✅ | api.md |
| G-API-06 | missing rooms | API | 400 | 400 | ✅ | api.md |
| G-API-07 | checkOut<=checkIn | API | 400 clear msg | 400 **empty msg** | ❌ | api.md |
| G-API-08 | invalid roomId | API | 400 | 400 | ✅ | api.md |
| G-API-09 | non-uuid holdId | API | 400 | 400 | ✅ | api.md |
| G-API-10 | unknown hold uuid | API | 404 | 404 `HOLD_NOT_FOUND` | ✅ | api.md |
| G-API-11 | quantity > availability | Data | conflict | **409 `ROOMS_NOT_AVAILABLE`** | ✅ | api.md |
| G-API-12 | release hold | API | 200 | 200 `{status:released}` | ✅ | api.md |
| G-API-13 | get after release | API | status visible | 200 `status:released` | ✅ | api.md |
| G-CONC-01 | 6 parallel holds | Data | no 5xx / no oversell | all 201 (inventory sufficed) | ✅ | api.md |
| G-UI-01 | create hold via "Tôi sẽ đặt" | UI/UX | POST 201 → /book | POST 201, routed /book | ✅ | [browser.md](./test-results/browser.md) |
| G-UI-02 | abandon hold (SPA back) | UI/UX | DELETE released | DELETE 200 | ✅ | browser.md |

## Verdict

- **Status:** 🟡 Partial — the holds feature is **production-quality** except for the recurring
  custom-validation message bug (G-F1, empty reason + empty field key). Authz (403 IDOR),
  oversell guard (409), TTL/expiry, and the UI lifecycle all behave correctly.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _1_ · S4 _0_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, browser.md, screenshot)
