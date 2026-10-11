# I — Payments (Guest) & Stripe Webhook

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial — reviewed (was ⏸ blocked); 2 S2 findings found & fixed · **Tier:** 1

## Scope

- **Entry points:** `POST/GET /payments`, `GET /payments/bookings/:bookingId`,
  `GET /payments/transactions/:transactionId`, `POST /webhooks/stripe`.
- **Risk focus:** webhook replay, fail-open secret, txn + external I/O.

## Review axes

- [x] UI/UX _(partial — the Stripe payment element was not driven in-browser; see gap below)_
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [x] Performance
- [x] Observability
- [x] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| I-API-01 | create intent for `pending_payment` booking | API | 201 `clientSecret` | 201 + real test-mode `pi_…_secret_…` | ✅ | [api.md](./test-results/api.md) |
| I-API-02 | reuse existing intent (idempotent) | API | same intent, no duplicate | same `paymentIntentId` returned | ✅ | [api.md](./test-results/api.md) |
| I-API-03 | intent for non-pending booking | API | 4xx | 400 `BOOKING_NOT_PENDING_PAYMENT` | ✅ | [api.md](./test-results/api.md) |
| I-API-04 | `GET /payments`, `/payments/bookings/:id`, `/payments/transactions/:id` | API | 200, scoped | 200; other buyer **403**; unknown **404** | ✅ | [api.md](./test-results/api.md) |
| I-API-05 | webhook signature valid → `pending_payment → confirmed` | API | 200, status confirmed | e2e `G2` passes (real `stripe listen` round-trip) | ✅ | [`guest.functional.test.js`](../../../server/__tests__/e2e/guest.functional.test.js) |
| I-API-06 | webhook invalid/missing signature | Security | rejected (fail-closed) | 400 `Invalid signature` (both cases) | ✅ | [api.md](./test-results/api.md) |
| I-API-07 | webhook replay (same event id) | Data | idempotent, no double-confirm | `isDuplicate(event.id)` → 200 `{duplicate:true}`; `webhook_event_log` dedupe | ✅ | code + [api.md](./test-results/api.md) |
| I-API-08 | refund path → `charge.refunded` | API | refund recorded | `handleRefundSucceeded` (feature [T](../T-admin-payments-refunds/)); guest cancellation refund covered in [H](../H-bookings-guest/) | ✅ | code + T/H |
| I-UI-01 | Stripe payment element + success page | UI/UX | confirms booking | card entry → **Pay** → `/book/complete` "Your booking is confirmed!"; booking `confirmed`, payment `succeeded` | ✅ | [ui.md](./test-results/ui.md) |

## Verdict

- **Status:** 🟡 Partial
- **Open findings:** S1 _0_ · S2 _2_ · S3 _0_ · S4 _0_ — **both S2 fixed in this pass**

## ✅ I-UI-01 verified (2026-10-11)

The guest **payment element** was driven end-to-end in a real browser (Playwright): card entry →
**Pay** → `/book/complete` ("Your booking is confirmed!"), with the webhook round-trip flipping the
booking to `confirmed` and recording a `succeeded` payment. Full evidence:
[`test-results/ui.md`](./test-results/ui.md).

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (API matrix)
