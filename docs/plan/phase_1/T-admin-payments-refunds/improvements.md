# T — Admin Payments & Refunds: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| T-F1 | Cross-hotel IDOR on transaction/refund routes | S2 | Resolve the transaction's (and refund's) `hotel_id` and assert it equals the hotel context before read/refund/retry; `403` on mismatch. Shared `requireTransactionInHotel` guard (see R-F1/S-F1). | M | | Open |
| T-F2 | Refunded amount not reflected in summary | S3 | Ensure refunded transactions contribute to `refundedAmount` (or exclude them from `grossAmount`); shared with P-F1. | S | | Open |

## ⚠️ Test-coverage gap (admin UI not exercised)

This feature was reviewed **API-only** (curl) plus reading the `admin-client` service layer — the
admin **UI pages were NOT driven via Playwright** in this pass (the admin client was rendering as
the guest for Q–T). This is a **coverage gap**, not a pass.

**TODO — re-run in the admin client signed in as `owner@travelnest.local`** and verify:
- `/payments` (transactions list, filters, summary cards)
- `/payments/refunds` (refunds list + initiate-refund flow)
- `/payments/transactions/[transactionId]` (detail; refund action gating by `payment.refund`)
- that a manager/staff (no `payment.refund`) does **not** see the refund action (`Can.vue`)

## Notes

- Refund rules need no change.
- T-F1 is the same systemic pattern as **R-F1** (inventory) and **S-F1** (bookings) — fix with one
  shared hotel-ownership guard across all `:id` admin routes.
