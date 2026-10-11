# F — Favorites / Saved Hotels: Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, client :5173), authenticated as Test User.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/browser.md`](./test-results/browser.md), screenshots.

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| F-F1 | S3 | UI/UX (data) | Saved-hotels cards show **fabricated static data** for every hotel: a hardcoded `★★★` rating, "Exceptional · 319 reviews", "2.8 km from centre", and `alt="BlackPink HomeStay"` — none derived from the actual saved hotel (e.g. Plaza Marcelino Flats Manor). | Template literals in `SavedHotels.vue` (lines 132–151) instead of `hotelInformation` fields. | browser.md | Open |
| F-F2 | S3 | UI/UX | The favorite **heart never reflects saved state** — an already-saved hotel still shows an empty heart; clicking again then hits `409 HOTEL_ALREADY_FAVORITE`. | `SavedHotelIcon.checkFavoriteHotel()` body is fully commented out, and `useInitialFavoriteStatus` defaults false → no favourite status is ever loaded. | browser.md, code | Open |
| F-F3 | S3 | UI/UX | Saved-hotels header controls are **dead UI**: "Share the list", "Create a list", "Show on map" buttons have no handlers; the trip `<select>` and the readonly "1 Feb - 5 Feb" / "1 adult · 1 room" pickers are static. | Placeholder markup added without behaviour. | browser.md | Open |
| F-F4 | S3 | UI/UX (a11y) | 20 favorite (heart) buttons on search results have **no `aria-label`**; the saved-card remove button is icon-only with no accessible name; card image alt is hardcoded/wrong. | Missing labels (also A-F5). | browser.md | Open |
| F-F5 | S4 | UI/UX | `SavedHotelIcon` declares `hotelId` as `Number` but receives UUID strings → console warning flood (see A-F4). | Wrong prop type. | browser.md, A-F4 | Open |

## Positives

- **API is correct and safe**: add `201`, duplicate `409 HOTEL_ALREADY_FAVORITE`, check returns
  `isFavorite`, remove `204` (idempotent for non-favorited), invalid UUID `400`, **missing hotel
  `404 HOTEL_NOT_FOUND`** (the previously-reported 500 FK error is fixed), no token `401`.
- **Per-user scoping** verified: User A and User B see independent lists/sets.
- **UI flow works**: empty state renders; adding via the heart fires `POST ... 201` and the
  hotel appears on `/saved-hotels`; removing via the close button fires `DELETE ... 204` and
  the count updates to "( 0 properties saved )".
- Images render (seeded URLs resolve).

## Verdict

**🟡 Partial.** The favourites backend is production-quality (correct statuses, no 5xx on
missing FK, per-user isolation). The problems are all client-side presentation: **fabricated
card data (F-F1)** and a **heart that never shows saved state (F-F2)** are the important ones —
they mislead users. F-F3/F-F4 are dead controls and a11y. Fixable client-only.
