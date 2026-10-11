# U — Admin Payouts & Stripe Connect: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| U-F1 | Cross-hotel IDOR on payout/account routes | S2 | Resolve the payout/account `hotel_id`/`owner_id` and assert it matches the hotel context before get/process/status/link/sync; `403` on mismatch. Shared guard (see R-F1/S-F1/T-F1). | M | | Open |
| U-F2 | `generate eligible` 500s (and can hang) with no ready account | S3 | Throw an `ApiError` (e.g. `409 NO_PAYOUT_READY_ACCOUNT`) or return `200 {generated:0}`; add a timeout around Stripe calls. | S | | Open |

## ⚠️ Test-coverage gap (admin UI not exercised)

This feature was reviewed **API-only** (curl) plus reading the `admin-client` service layer — the
admin **UI pages were NOT driven via Playwright** in this pass (the admin client was rendering as
the guest for Q–U). This is a **coverage gap**, not a pass.

**TODO — re-run in the admin client signed in as `owner@travelnest.local`** and verify:
- `/payouts` (payout list, status filters, "Generate eligible" action + its empty/error states)
- `/payouts/[payoutId]` (detail, process, set-status controls)
- `/payouts/connected-accounts` (list, check, create, link/onboarding, sync)
- that a manager/staff without `payment.process` sees no process/generate controls (`Can.vue`)

## Notes

- U-F1 is the same systemic pattern as **R-F1 / S-F1 / T-F1** — fix with one shared
  hotel-ownership guard across all `:id` admin routes.
