# H — Bookings (Guest): Review

Date: 2026-10-09 · Environment: local dev stack + Stripe test mode, authenticated as Test User.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md), [`test-results/browser.md`](./test-results/browser.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| H-F1 | **S2** | UI/UX | **Guest cancellation is broken / unreachable.** The cancel action is only rendered when `status === 'confirmed'` (`BookingDetails.vue:92`), so a `pending_payment` booking — the normal pre-payment state, and one the API *can* cancel — has **no way to be cancelled in the UI**. When reached, `BookingCancellation.cancelBooking()` POSTs to **`/api/cancel-bookings`, which returns 404**, and silently returns unless the status is `confirmed`. It never uses the working `BookingService.cancelBooking()` → `DELETE /bookings/:id`. | Cancellation view was not migrated to the module endpoint; status gate is stale. | browser.md | Open |
| H-F2 | **S2** | UI/UX | **Cancel flow step 1 never advances.** The "Continue" button is `type="submit"` inside a plain `<form>` with no `@submit.prevent`, so it triggers a native submit/reload that resets `step` to 1. Verified: stays on "Step 1 of 2" after selecting a reason. | Missing `@submit.prevent` / button not `type="button"`. | browser.md | Open |
| H-F3 | S3 | UI/UX (i18n) | Booking **status is shown as a raw enum** (`pending_payment`, `expired`, `confirmed`) in the list and details prose ("Your booking in View Hotel is **pending_payment**"). | `{{ booking.status }}` rendered directly, not mapped to a label/i18n. | browser.md | Open |
| H-F4 | S3 | API/contract | **Double-cancel returns different results by path**: sequential → `400 ALREADY_CANCELLED`; concurrent race → `409 BOOKING_ALREADY_CANCELLED`. Same state, two status codes and two codes. | Two code paths handle the already-cancelled case. | notes.md, api.md H-API-14 | Open |
| H-F5 | S3 | UI/UX | Booking-details action links are placeholders (`href="#"`): "Edit guest details", "Message property", "Change dates", "Change your room" do nothing. | Stub UI. | browser.md | Open |
| H-F6 | S4 | UI/UX | Tab title remains `Vite App`. | Cross-ref A-F6. | browser.md | Open |

## Positives

- **Idempotency is excellent**: `Idempotency-Key` required (`400` if missing); replay of the same
  key+body returns the same booking; key reuse with a different body → `409 IDEMPOTENCY_KEY_REUSED`;
  **concurrent** identical create → one `201` + one `409 REQUEST_IN_PROGRESS`, no 5xx.
- **Create** returns the full picture: `bookingId`, `bookingCode`, `status: pending_payment`,
  `paymentDueAt`, `transactionId`, price breakdown, rooms/nightly, cancellation policy.
- **Payment intent** works against Stripe test mode → `201` with a real `clientSecret`.
- **Authz / IDOR**: no token → `401`; another user reading/cancelling your booking → `404`
  (existence not leaked); using another user's hold → `403 FORBIDDEN`.
- **Cancel API**: `200` with `cancellationPolicy` (free cancellation, `refundAmount`,
  `isRefundable`); **concurrent** double-cancel → `409`, no 5xx.
- **Edge**: unknown booking → `404`; invalid id → `400`; unknown hold → `404 HOLD_NOT_FOUND`;
  released hold → `400 HOLD_NOT_ACTIVE`.
- UI: bookings list (with time filters) and booking details (code, PIN, room, guests, dates) render.

## Notes

- `/book` checkout renders the hotel, dates and total (see G).

## Verdict

**🟡 Partial (S2 blockers).** The booking **API is production-quality** — idempotency, authz,
race handling and Stripe are all correct. But the **guest cancellation UI is non-functional**
(H-F1: dead endpoint + wrong status gate; H-F2: stuck step) and can't cancel the very bookings
the API supports. H-F1/H-F2 must be fixed before production.
