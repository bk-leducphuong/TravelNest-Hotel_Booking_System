# U — Admin Payouts & Stripe Connect

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 1

## Scope

- **Entry points:** `GET /admin/payouts`, `/hotels/:hotelId/summary`, `POST /admin/payouts/eligible`, connected-accounts (list/check/create/link/sync), `GET /admin/payouts/:payoutId`, `POST /:payoutId/process`, `PATCH /:payoutId/status`. UI: `payouts/index`, `payouts/[payoutId]`, `payouts/connected-accounts`.
- **Risk focus:** duplicate/incorrect payouts.
- **Environment:** local dev stack, owner/admin seeded, Stripe test mode, 2026-10-09.

## Review axes

- [ ] UI/UX _(⚠️ admin UI not exercised — see improvements.md)_
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability _(audit + payout events)_
- [ ] Infra dependency _(Stripe Connect)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| U-API-01 | list payouts (own) | API | 200 | 200 | ✅ | [api.md](./test-results/api.md) |
| U-API-02 | hotel payout summary | API | 200 | 200 | ✅ | api.md |
| U-API-03 | connected accounts list | API | 200 | 200 | ✅ | api.md |
| U-API-04 | check connected account | API | 200 | 200 | ✅ | api.md |
| U-API-07 | invalid payout transition (processing→cancelled) | Data | 409 | 409 `INVALID_PAYOUT_STATUS_TRANSITION` | ✅ | api.md |
| U-API-08 | invalid status value | API | 400 | 400 | ✅ | api.md |
| U-API-09 | no token | Security | 401 | 401 | ✅ | api.md |
| U-API-10 | foreign hotel summary | Security | 403 | 403 | ✅ | api.md |
| **U-API-05** | **generate eligible (no ready account)** | API | 4xx/empty | **500** (then hangs) | ❌ | notes.md |
| **U-IDOR-READ** | read **foreign** payout w/ own `X-Hotel-Id` | **Security** | deny | **200** | ❌ | api.md |
| **U-IDOR-STATUS** | change **foreign** payout status | **Security** | deny | **200** | ❌ | api.md |
| **U-IDOR-PROCESS/LINK** | process foreign payout / link foreign account | **Security** | deny | **reached logic (409/400)** | ❌ | api.md |

## Verdict

- **Status:** 🟡 Partial (S2) — the payout state machine and reads are correct, but payout/account
  routes share the **cross-hotel IDOR** (U-F1), and `generate eligible` 500s/hangs when no
  payout-ready account exists (U-F2). Not production-ready.
- **Open findings:** S1 _0_ · S2 _1_ · S3 _1_ · S4 _0_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work + **UI coverage gap**
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md)
