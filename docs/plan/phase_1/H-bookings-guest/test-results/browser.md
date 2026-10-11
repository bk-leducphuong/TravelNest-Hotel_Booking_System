# H — Bookings (Guest): Browser evidence (Playwright)

Authenticated as **Test User** (re-login via Keycloak was required mid-run), 2026-10-09.

## Pages

| Page | Result |
|---|---|
| `/bookings` | ✅ renders "Bookings & Trips", time filters (Tất cả / Hôm nay / …), booking cards with hotel, city, dates, "Free cancellation", price |
| `/bookings/<code>` | ✅ renders "Your booking in View Hotel is …", booking code, PIN code, room(s), guests, check-in/out |

## H-F3 — raw status enums

List card shows `pending_payment`, `expired` literally; details prose: **"Your booking in View
Hotel is pending_payment."** (`{{ booking.status }}` in `Bookings.vue:201`).

## H-F1 — cancellation unreachable + dead endpoint

- `BookingDetails.vue:92` renders the right action panel (incl. the "Cancel your booking"
  `RouterLink`) only when `getBookingInformation.status === 'confirmed'`. A `pending_payment`
  booking shows no cancel option.
- `BookingCancellation.vue` `cancelBooking()`:

```js
if (this.getBookingInformation.status !== 'confirmed') return       // silently no-op
const response = await axios.post(`${VITE_SERVER_HOST}/api/cancel-bookings`, {...})
```

- `POST /api/cancel-bookings` → **404** (endpoint does not exist). The working service method
  `BookingService.cancelBooking()` → `DELETE /api/v1/bookings/:id` is **not used**.

## H-F2 — step 1 never advances

`BookingCancellation.vue:80-92`: `<form>` with `<button type="submit" @click="nextStep">`. No
`@submit.prevent` → native submit reloads the page and `step` resets to 1. Verified: after
selecting a reason and clicking Continue, the page stayed on "Step 1 of 2".

## H-F5 — placeholder links

`BookingDetails.vue:99-102`: `href="#"` for "Edit guest details", "Message property",
"Change dates", "Change your room".

> Screenshots for this feature timed out in the harness ("waiting for fonts"); evidence above is
> from DOM inspection. `bookings-list.png` / `booking-details.png` may be absent.
