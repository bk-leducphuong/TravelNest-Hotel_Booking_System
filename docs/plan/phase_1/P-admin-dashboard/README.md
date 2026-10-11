# P — Admin Dashboard

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 3

## Scope

- **Entry point:** admin client dashboard (`pages/index.vue`) composing hotel-scoped admin APIs: bookings stats/trend, payments summary, payouts summary, occupancy, reviews summary. Charts: `TrendChart`, `DonutChart`, `BarChart`.
- **Risk focus:** wrong/lagging aggregates.
- **Environment:** local dev stack (API :3000, admin :8000), signed in as **owner@travelnest.local** (active hotel "The Poplar Road Inn"), 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz _(cards gated by `can(...)`)
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| P-API-01 | bookings stats | API | totals + byStatus | 41 total; byStatus sums to 41 | ✅ | [api.md](./test-results/api.md) |
| P-API-02 | bookings trend (14d) | API | points | 14 points | ✅ | api.md |
| P-API-03 | payments summary | API | gross/net/refunded | gross 174,831.65; **refunded 0 (but 2 refunded txns)** | ⚠️ | api.md |
| P-API-04 | payouts summary | API | totals | 0 (no payouts) | ✅ | api.md |
| P-API-05 | occupancy | API | rate = booked/total | 2.42% (24/992) | ✅ | api.md |
| P-API-06 | reviews summary | API | counts + avg | 23 published, avg 7.74 | ✅ | api.md |
| P-UI-01 | dashboard renders (owner) | UI/UX | cards + charts | 6 cards + 3 charts | ✅ | [browser.md](./test-results/browser.md) |
| P-UI-02 | card permission gating | Security | gated by `can()` | code-verified | ✅ | browser.md |
| P-UI-03 | chart values match API | Data | consistent | consistent (occupancy, bookings, trend) | ✅ | browser.md |

## Verdict

- **Status:** 🟡 Partial — the dashboard renders correctly and its aggregates are internally
  consistent, but the **revenue "Refunded"/"Net" figures understate refunds** (P-F1, shared with
  feature T's payment summary). Otherwise production-quality.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _1_ · S4 _0_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, browser.md)
