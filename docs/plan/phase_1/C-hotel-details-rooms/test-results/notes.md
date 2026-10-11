# C — Hotel Details, Rooms & Policies: Supplementary evidence

Captured 2026-10-09 (hotel `01a105dc-24d4-7ffc-98e0-32d730d886d1`, 2026-10-11 → 2026-10-13).

## C-F1 — Room price mismatch (same room id + dates)

| Room | `/hotels/:id/rooms` `pricePerNight` | `/search/hotels` `price_per_night` |
|---|---|---|
| Single 733 (`…36a5633c03d1`) | **592.7** | **272.59** |
| Twin 618 (`…36a680961b2f`) | **231.99** | **141.665** |
| Family 717 (`…36a77c42d88f`) | **435.29** | **188.155** |
| Suite 246 (`…36a9d4a4982a`) | **450.97** | **214.51** |

`/rooms` `totalPrice = null` for all rows; `/search` returns `total_price`
(e.g. Twin 283.33 = 141.665 × 2 nights).

**UI:** the hotel page renders the `/rooms` values — Single **592**, Twin **231**,
Suite **450** — i.e. the inflated set, diverging from search results.

## C-F6 — Free-cancellation flag inconsistent

- `/hotels/:id/policies` contains a policy titled **"Free Cancellation"** → `True`.
- Room cards render "Miễn phí hủy" (free cancellation).
- `/search/hotels` for the same hotel → `has_free_cancellation: **false**`.

So the search `freeCancellation` filter would exclude a hotel that advertises free
cancellation.

## C-F3 — Broken custom validation messages

```
GET /hotels/:id?checkInDate=2026-10-11
400 {"fields":{"":"\"value\" failed custom validation because "}}

GET /hotels/:id/rooms?checkInDate=2026-10-13&checkOutDate=2026-10-11
400 {"fields":{"":"\"value\" failed custom validation because "}}
```

## C-UI — Console / images

- Console error on the hotel page: `GET /search/hotels?...&maxPrice=500` → **400**
  (the app's own default filter; manifestation of B-F2).
- Empty-src images: 3 in room "name" cells (`alt=""`) + 5 footer brand logos.
- Page title: `Vite App`.
- Keycloak `parseCallbackUrl` errors also present (A-F9/D).
