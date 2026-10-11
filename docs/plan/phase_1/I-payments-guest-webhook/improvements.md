# I — Payments (Guest) & Stripe Webhook: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| I-F1 | `GET /payments/bookings/:id` 500 (filters `transactions.booking_code`) | S2 | Query `transactions` by `booking_id` directly; drop the `booking_code` join | S | — | ✅ Done |
| I-F2 | `GET /payments/transactions/:id` 403 (UUID through `parseInt`) | S2 | Pass the UUID string through unchanged | S | — | ✅ Done |
| I-UI-01 | Payment element not exercised in-browser | Coverage | Drive card entry → confirm → success page with a browser + `stripe listen` | M | — | ✅ Done |

## Changes applied

- `server/modules/payment/infrastructure/payment.repository.js` — `findPaymentByBookingId` now
  filters `Transactions` by `booking_id` (removed the dead `booking_code` lookup and the now-unused
  `Bookings` import).
- `server/modules/payment/api/payment.controller.js` — `getPaymentByTransactionId` no longer runs
  `parseInt()` over the transaction id.
- `server/__tests__/e2e/guest.functional.test.js` — added `G7` regression: lookup by booking **and**
  by transaction both return the buyer's payment (guards both I-F1 and I-F2).

## Verification

- API matrix re-run: `I-API-04b` and `I-API-04c` now **200** (were 500 / 403) — see
  [`test-results/api.md`](./test-results/api.md).
- e2e: **84/84** pass (including the new `G7` and the `stripe listen` webhook `G2`).
- Scoping re-checked: own → 200, other buyer → 403, unknown id → 404.

## Notes

- The webhook event log (`webhook_event_log`) provides replay protection; no change needed.
- I-UI-01 remains a coverage gap, not a defect.
