# H — Bookings (Guest)

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 1

## Scope

- **Entry points:** `POST /bookings` (from hold, idempotent), `GET /bookings`, `GET /bookings/code/:code`, `GET /bookings/:id`, `POST /bookings/:id/payment-intent`, `DELETE /bookings/:id` (cancel). UI: `Book` (checkout), `Bookings`, `BookingDetails`, `BookingCancellation`.
- **Risk focus:** double-charge, race on cancel.
- **Environment:** local dev stack + Stripe test mode (API :3000, client :5173), authenticated as Test User, 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [x] Performance
- [x] Observability
- [ ] Infra dependency _(Stripe webhook → feature I)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| H-API-01 | create booking from hold (idempotent) | API | 201 | 201 (bookingId, code, pending_payment, price) | ✅ | [api.md](./test-results/api.md) |
| H-API-02 | replay same key+body | API | same booking | 201 same bookingId | ✅ | api.md |
| H-API-03 | key reuse + different body | API | 409 | 409 `IDEMPOTENCY_KEY_REUSED` | ✅ | api.md |
| H-API-04 | missing Idempotency-Key | API | 400 | 400 `IDEMPOTENCY_KEY_REQUIRED` | ✅ | api.md |
| H-API-05/06/07 | list / by id / by code | API | 200 | 200 | ✅ | api.md |
| H-API-08 | payment intent | API | 201 | 201 Stripe clientSecret | ✅ | api.md |
| H-API-09 | create no token | Security | 401 | 401 | ✅ | api.md |
| H-API-10/11/12 | user B read/cancel A's booking | Security | deny | **404** (not leaked) | ✅ | api.md |
| H-API-13 | cancel booking | API | 200 | 200 + cancellationPolicy | ✅ | api.md |
| H-API-14 | double cancel (sequential) | API | 409 | **400 `ALREADY_CANCELLED`** | ❌ | api.md |
| H-RACE-01 | parallel idempotent create | Data | no 5xx | 201 + 409 `REQUEST_IN_PROGRESS` | ✅ | notes.md |
| H-RACE-02 | parallel cancel | Data | no 5xx | 200 + 409 `BOOKING_ALREADY_CANCELLED` | ✅ | notes.md |
| H-SEC-01 | user B book from A's hold | Security | deny | 403 `FORBIDDEN` | ✅ | notes.md |
| H-API-15/16/17/18 | invalid/unknown booking, unknown/released hold | API | 4xx | 400/404/404/400 | ✅ | api.md |
| H-UI-01 | bookings list renders | UI/UX | renders | renders (filters + cards) | ✅ | [browser.md](./test-results/browser.md) |
| H-UI-02 | booking details renders | UI/UX | renders | renders (code, PIN, rooms, dates) | ✅ | browser.md |
| H-UI-03 | status display | UI/UX | human label | **raw enum** (`pending_payment`) | ❌ | browser.md |
| H-UI-04 | cancel a pending_payment booking | UI/UX | possible | **cancel link hidden (confirmed-only)** | ❌ | browser.md |
| H-UI-05 | cancel flow step 1 → 2 | UI/UX | advances | **stuck (form submit reload)** | ❌ | browser.md |
| H-UI-06 | cancel API call | UI/UX | `DELETE /bookings/:id` | **POST `/api/cancel-bookings` → 404** | ❌ | browser.md |

## Verdict

- **Status:** 🟡 Partial — the **booking API is production-quality** (idempotency, authz,
  races, Stripe intent all correct), but the **guest cancellation UI is broken** (H-F1/H-F2)
  and statuses are shown as raw enums (H-F3). Not production-ready.
- **Open findings:** S1 _0_ · S2 _2_ · S3 _3_ · S4 _1_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md, browser.md, screenshots)
