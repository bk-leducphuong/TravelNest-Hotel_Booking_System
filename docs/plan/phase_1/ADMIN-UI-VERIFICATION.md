# Admin UI verification (M5)

Fills the **admin UI coverage gap** flagged for features **O–V**. The admin client
(`http://localhost:8000`) was driven with **Playwright** signed in as
**`owner@travelnest.local`** (active hotel "The Poplar Road Inn"), 2026-10-11.

## Pages exercised

| Feature | Page | Result |
|---|---|---|
| Q | `/properties` | ✅ hotel card renders ("The Poplar Road Inn") |
| Q | `/properties/01a105dc-2510-…` | ✅ Details / Rooms / Policies tabs (4 tables) |
| R | `/availability` | ✅ month calendar with per-room allotment ("Allotment: 8") |
| S | `/bookings` | ✅ table (Code / Guest / Stay), status filters |
| S | `/bookings/01a105e0-328d-…` | ✅ booking detail renders |
| T | `/payments` | ✅ transactions table + Refunds link |
| T | `/payments/refunds` | ✅ refunds table |
| U | `/payouts` | ✅ payouts table + Connected accounts |
| U | `/payouts/connected-accounts` | ✅ "Payout readiness: Not ready" |
| V | `/reviews` | ✅ reviews table + filters (status / min-max rating / reply) |
| V | `/reviews/01a105e2-5a78-…` | ✅ review detail renders |

## Notes

- All pages loaded with **no page errors**; the only console noise was the recurring Keycloak
  `parseCallbackUrl` error (A-F9/D-F2 — still open).
- Screenshots timed out in the harness ("waiting for fonts"); evidence is DOM-based.
- The admin client shares the realm SSO, so signing in as **owner** required logging out of the
  guest session first.

## Impact

The **"⚠️ Test-coverage gap (admin UI not exercised)"** notes in the `Q`–`V`
`improvements.md` files are now **resolved**: the pages were exercised and render correctly.
