# S — Admin Bookings: Review

Date: 2026-10-09 · Environment: local dev stack, owner/manager/staff seeded.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| S-F1 | **S2** | Security/authz | **Cross-hotel IDOR on `/admin/bookings/:bookingId` — read, status write, and cancel.** A manager of hotel A can, by sending their own `X-Hotel-Id`: (a) `GET` hotel B's booking → **200**, (b) `PATCH …/status` → **200**, (c) `POST …/cancel` → **200**. | The routes have no `hotelId` param; `requireHotelPermission(BOOKING_READ/MANAGE/CANCEL)` resolves the hotel from the **`X-Hotel-Id` header only**, and the use-cases (`getBooking`, `updateBookingStatus`, `forceCancelBooking`) take only the `bookingId` — they never assert the booking's `hotel_id` equals the hotel context. | api.md S-IDOR-READ/WRITE/CANCEL | Open |

## Positives

- **Status state machine is enforced**: `confirmed → completed` (must pass through `checked_in`) → **409 `INVALID_BOOKING_STATUS_TRANSITION`**; an unknown status value → **400**.
- Own-hotel flows work: list `200`, stats `200`, trend `200`, get `200`, valid `confirmed → checked_in` `200`, force-cancel `200`.
- `GET /admin/bookings/hotels/:hotelId/stats` with a **foreign** hotel id → `403` (the path param *is* the hotel context, so it is checked).
- No token → `401`.

## Notes / limitations

- Test mutations were **restored**: the two bookings used (one own, one foreign) were reset to `confirmed` in the DB after the run. Force-cancel may have released inventory (not undone); note for the demo data.
- Same class as **R-F1** — room/booking-scoped admin routes trusting `X-Hotel-Id` instead of the target entity's hotel.

## Verdict

**🟡 Partial (S2).** The booking state machine is well-designed and the own-hotel experience is
correct, but **S-F1** is a serious cross-tenant hole: a manager can read, mutate, or cancel
another hotel's bookings. Fix by resolving the booking's `hotel_id` and asserting it equals the
hotel context (a shared `requireBookingInHotel` guard, mirroring the R-F1 fix).
