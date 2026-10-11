# P — Admin Dashboard: Browser evidence

Admin client `http://localhost:8000`, signed in as **owner@travelnest.local** (active hotel
"The Poplar Road Inn"), 2026-10-09.

## Render ✅

Nav: Dashboard · Property · Bookings · Availability · Payments · Payouts · Reviews.

KPI cards (6): Gross revenue $174,832 · Net revenue $174,832 · Occupancy 2.42% · Bookings 41 ·
Average rating 7.7 · Pending payouts $0. Charts (3): Bookings trend (14d), Occupancy donut,
Revenue bar; plus "Bookings by status" progress bars.

Values match the API responses (see `api.md`).

## Gating ✅ (code + guest empty state)

`pages/index.vue` shows each card only when `can("…")` passes:

```ts
{ label: "Gross revenue", …, show: can("payment.read") }
{ label: "Occupancy",     …, show: can("room.read") }
{ label: "Bookings",      …, show: can("booking.read") }
{ label: "Average rating",…, show: can("review.read") }
```

and `load()` only fetches a source when the permission is present; the whole panel is hidden
without an `activeHotelId` (guest saw "No hotel is assigned to your account…").

## Harness notes

- Full-page screenshots timed out ("waiting for fonts") — DOM evidence used instead.
- Positive render required logging the admin client out and back in as **owner** (the shared
  SSO had been the guest); login via `#kc-login` DOM click worked.
