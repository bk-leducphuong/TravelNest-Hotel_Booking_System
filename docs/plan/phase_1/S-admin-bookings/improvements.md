# S — Admin Bookings: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| S-F1 | Cross-hotel IDOR on `/admin/bookings/:bookingId` (read/write/cancel) | S2 | Resolve the booking's `hotel_id` and assert it equals the hotel context before get/update/cancel; `403` on mismatch. Add a shared `requireBookingInHotel` guard. | M | | ✅ Fixed (M1) |

## Notes

- **S-F1 is the priority** — a cross-tenant write/cancel. Same root pattern as **R-F1**
  (`/admin/inventory/rooms/:roomId`). Strongly recommend a **single shared guard** used by every
  `:id`-scoped admin route that resolves the hotel from a header:
  resolve the entity's `hotel_id`, compare to the hotel context, `403` on mismatch.
- Also sweep: media (`/images/...`), catalog (`/admin/hotels/:hotelId/*` is fine — hotel in path),
  reviews (`/admin/reviews/:reviewId`), payments (`/admin/payments/...`), payouts.
- Re-test: manager GET/PATCH/cancel a foreign booking with own `X-Hotel-Id` → `403`.

## ✅ Admin-UI coverage (gap filled in M5)

This feature was reviewed **API-only** in the first pass; the admin **UI pages were then driven via Playwright in M5** (signed in as `owner@travelnest.local`) — see [`ADMIN-UI-VERIFICATION.md`](../ADMIN-UI-VERIFICATION.md).

**Pages exercised:**
- `/bookings` (list, filters, pagination, status tags)
- `/bookings/[bookingId]` (detail, status-change control, force-cancel action + refund option)
- that status-change options respect the state machine and the `booking.manage`/`booking.cancel`
  permissions (`Can.vue`)
