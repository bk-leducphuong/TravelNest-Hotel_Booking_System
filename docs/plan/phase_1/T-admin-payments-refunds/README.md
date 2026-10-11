# T — Admin Payments & Refunds

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 1

## Scope

- **Entry points:** `GET /admin/payments/hotels/:hotelId/summary`, `GET /admin/payments/transactions[/:transactionId]`, `POST /admin/payments/transactions/:transactionId/refunds`, `GET /admin/payments/refunds[/:refundId]`, `POST /admin/payments/refunds/:refundId/retry`. UI: `payments/index`, `payments/refunds`, `payments/transactions/[transactionId]`.
- **Risk focus:** over-refund, refund without permission.
- **Environment:** local dev stack, owner/manager/staff seeded, 2026-10-09.

## Review axes

- [ ] UI/UX _(⚠️ admin UI not exercised — see improvements.md)_
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability _(audit on refund)_
- [ ] Infra dependency _(Stripe)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| T-API-01 | payments summary (own) | API | 200 | 200 | ✅ | [api.md](./test-results/api.md) |
| T-API-02 | transactions list | API | 200 | 200 | ✅ | api.md |
| T-API-03 | refunds list | API | 200 | 200 | ✅ | api.md |
| T-API-04 | **over-refund** (amount 999999) | Data | 400 | 400 `REFUND_EXCEEDS_REMAINING` | ✅ | api.md |
| T-API-05 | invalid refund reason | API | 400 | 400 | ✅ | api.md |
| T-API-07 | no token | Security | 401 | 401 | ✅ | api.md |
| T-API-08 | foreign hotel summary | Security | 403 | 403 | ✅ | api.md |
| **T-IDOR-READ-TXN** | read **foreign** transaction w/ own `X-Hotel-Id` | **Security** | deny | **200** | ❌ | api.md |
| **T-IDOR-REFUND** | **initiate refund on foreign txn** w/ own `X-Hotel-Id` | **Security** | deny | **reached refund logic (400 over-amount)** | ❌ | notes.md |

## Verdict

- **Status:** 🟡 Partial (S2) — refund **rules** are strong (over-refund guard, reason
  validation, refundable-status checks), but transaction/refund routes share the **cross-hotel
  IDOR** (T-F1): a hotel user can read a foreign transaction and initiate a refund on it.
- **Open findings:** S1 _0_ · S2 _1_ · S3 _1_ · S4 _0_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work + **UI coverage gap**
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md)
