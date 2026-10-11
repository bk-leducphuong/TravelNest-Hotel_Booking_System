# U — Admin Payouts & Stripe Connect: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| U-F1 | Cross-hotel IDOR on payout/account routes | S2 | Resolve the payout/account `hotel_id`/`owner_id` and assert it matches the hotel context before get/process/status/link/sync; `403` on mismatch. Shared guard (see R-F1/S-F1/T-F1). | M | | ✅ Fixed (M1) |
| U-F2 | `generate eligible` 500s (and can hang) with no ready account | S3 | Throw an `ApiError` (e.g. `409 NO_PAYOUT_READY_ACCOUNT`) or return `200 {generated:0}`; add a timeout around Stripe calls. | S | | ✅ Fixed (M6) |

## ✅ Admin-UI coverage (gap filled in M5)

This feature was reviewed **API-only** in the first pass; the admin **UI pages were then driven via Playwright in M5** (signed in as `owner@travelnest.local`) — see [`ADMIN-UI-VERIFICATION.md`](../ADMIN-UI-VERIFICATION.md).

**Pages exercised:**
- `/payouts` (payout list, status filters, "Generate eligible" action + its empty/error states)
- `/payouts/[payoutId]` (detail, process, set-status controls)
- `/payouts/connected-accounts` (list, check, create, link/onboarding, sync)
- that a manager/staff without `payment.process` sees no process/generate controls (`Can.vue`)

## Notes

- U-F1 is the same systemic pattern as **R-F1 / S-F1 / T-F1** — fix with one shared
  hotel-ownership guard across all `:id` admin routes.
