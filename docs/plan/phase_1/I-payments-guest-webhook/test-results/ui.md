# Feature I — I-UI-01: Stripe payment element driven in-browser

> Date: 2026-10-11 · Environment: local dev stack (API `:3000`, client `:5173`, Keycloak `:8080`),
> Stripe test mode with the CLI forwarding webhooks
> (`stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`).

## Flow exercised (Playwright, real browser)

| # | Step | Result |
|---|------|--------|
| 1 | Sign in as guest (`test@travelnest.com`) via the Keycloak page | ✅ redirected back to the app, header shows **Test User** |
| 2 | Search `Ha Noi`, 2026-12-20 → 2026-12-22; open the first result (`01a105dc-24d4-7ffc-98e0-32d730d886d1`) | ✅ hotel page, rooms listed |
| 3 | Select 1 room → click **"Tôi sẽ đặt"** | ✅ hold created → routed to `/book` |
| 4 | Step 2 → **"Next: Final details"** | ✅ step 3 shows the Stripe card Element |
| 5 | Enter card `4242 4242 4242 4242`, exp `12/34`, CVC `123`, postal `100000` (Stripe iframes) | ✅ Element validated (no `#card-errors`) |
| 6 | Click **Pay** | ✅ `confirmCardPayment` succeeded → `/book/complete?bookingCode=BKMV3H44X30F8D27` |

**Success page:** "Your booking is confirmed! Booking ID: BKMV3H44X30F8D27" — screenshot
[`i-ui-01-success.png`](./i-ui-01-success.png).

## Server-side verification (after the webhook round-trip)

```
GET /api/v1/bookings/code/BKMV3H44X30F8D27   → status: confirmed
GET /api/v1/payments/bookings/01a129c2-fee7-7c83-9e9a-7c1e2cbfc0c8
  → transaction: { id: 01a129c2-feeb-…, status: completed, transaction_type: payment,
                   amount: 353.71 USD, stripe_payment_intent_id: pi_3UPGjr…,
                   stripe_charge_id: ch_3UPGjr…, completed_at: 2026-10-11T07:00:43Z }
  → payments: [{ payment_method: card, payment_status: succeeded, amount: 353.71, paid_at: … }]
```

So the full guest path is proven end-to-end: **card entry → PaymentIntent → Stripe webhook →
booking `pending_payment` → `confirmed` → payment recorded `succeeded`**.

## Incidental findings surfaced during the run (both fixed)

| # | Sev | Symptom | Root cause | Fix |
|---|-----|---------|-----------|-----|
| K-F5 | S2 | Every authenticated WebSocket namespace (`/user`, `/property`, `/support`, `/admin`) rejected the connection with *"Bearer token is missing the subject claim"* → realtime notifications and hold-expiry events dead. | M4 made `verifyJwt` **async** (JWKS support) but `server/platform/realtime/auth.js` still called `verifyJwt(token)` **without `await`**, so `resolveAuthenticatedUser` received a pending Promise. | Added `await`; verified `[userSocket] connected` + server log `Socket authenticated`. Regression test added. |
| C-F9 | S3 | `ReferenceError: flatpickr is not defined` on the hotel-details page; the date-range picker never initialised. | `HotelDetails.vue` used the **global** `flatpickr(...)` although the package was never imported (and no CDN script exists). | Added `import flatpickr from 'flatpickr'` + its CSS; date input now gets `.flatpickr-input` and the calendar renders. |

## Notes

- The Stripe card Element requires a **postal code** (Stripe shows it after the number is complete);
  the test entered `100000`. Not a defect — Stripe's default `hidePostalCode: false`.
- `browser_run_code_unsafe` was used for the Stripe **iframe** fields
  (`input[name=cardnumber|exp-date|cvc|postal]`), which the standard locator tooling cannot reach.
