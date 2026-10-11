# V — Admin Reviews & Moderation: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| V-F1 | Cross-hotel IDOR on `/admin/reviews/:reviewId` (read + reply) | S2 | Resolve the review's `hotel_id` and assert it matches the hotel context before get/status/reply; `403` on mismatch. Shared guard (see R-F1/S-F1/T-F1/U-F1). | M | | ✅ Fixed (M1) |
| V-F2 | Owner role bypasses hotel-scoped permission checks | S4 | Decide: keep (owner = superuser) or enforce per-permission checks for owners too; document the choice | S | | ✅ Fixed (M1) |

## ⚠️ Test-coverage gap (admin UI not exercised)

This feature was reviewed **API-only** (curl) plus reading the `admin-client` service layer — the
admin **UI pages were NOT driven via Playwright** in this pass (the admin client was rendering as
the guest for Q–V). This is a **coverage gap**, not a pass.

**TODO — re-run in the admin client signed in as `owner@travelnest.local`** (and as
`support@travelnest.local` for moderation) and verify:
- `/reviews` (moderation queue, filters by status/rating/reply, hotel scoping)
- `/reviews/[reviewId]` (detail, reply editor, status controls)
- that the reply control shows for `review.reply` roles and the **status/moderation** control only
  for `review.moderate` roles (or owners, per V-F2)

## Notes

- V-F1 is the same systemic pattern as **R-F1 / S-F1 / T-F1 / U-F1** — one shared hotel-ownership
  guard fixes all.
