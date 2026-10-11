# H — Bookings (Guest): Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| H-F1 | Cancellation unreachable / dead endpoint | S2 | Show "Cancel" for cancellable statuses (at least `pending_payment`/`confirmed`); replace the axios POST to `/api/cancel-bookings` with `BookingService.cancelBooking(bookingId, processRefund)` | M | | ✅ Fixed (M3) |
| H-F2 | Cancel step 1 never advances | S2 | Add `@submit.prevent` to the `<form>` (or make the button `type="button"`) | XS | | ✅ Fixed (M3) |
| H-F3 | Raw status enums in UI | S3 | Map status → localized label (EN/VI) in list + details; never render the raw enum | S | | ✅ Fixed (M4) |
| H-F4 | Double-cancel returns 400 vs 409 by path | S3 | Normalise to a single `409 BOOKING_ALREADY_CANCELLED` on both sequential and concurrent paths | S | | ✅ Fixed (M4) |
| H-F5 | Placeholder `href="#"` action links | S3 | Implement or hide "Edit guest details / Message property / Change dates / Change your room" | M | | ✅ Fixed (M6) |
| H-F6 | Tab title "Vite App" | S4 | Cross-ref A-F6 | S | | ✅ Fixed (M4) |

## Notes

- **H-F1/H-F2 are the priority**: the guest can't cancel a booking in the UI, and the API it
  calls doesn't exist. The backend already exposes a correct endpoint — this is a client rewrite.
- H-F3 (status labels) is a small, high-visibility polish.
- Ready to re-test after fixes: cancel a `pending_payment` booking end-to-end via the UI and
  confirm `DELETE /bookings/:id` is called and the status becomes `cancelled`.
