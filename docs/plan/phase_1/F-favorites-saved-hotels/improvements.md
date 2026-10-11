# F — Favorites / Saved Hotels: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| F-F1 | Fabricated card data (★★★, "319 reviews", "2.8 km", wrong alt) | S3 | Render real fields from `hotelInformation` (class→stars, real review count/distance); use the hotel name as `alt` | S | | ✅ Fixed (M4) |
| F-F2 | Heart never shows saved state | S3 | Re-enable `checkFavoriteHotel()` (call `isFavoriteHotel`) or pass `initialIsFavorite` from the list/search payload | S | | ✅ Fixed (M4) |
| F-F3 | Dead header controls | S3 | Wire "Share/Create/Show on map" or remove them; make the trip selector/date/guests real or drop them | M | | ✅ Fixed (M4) |
| F-F4 | Missing accessible names on favorite/remove buttons | S3 | Add `aria-label` (e.g. "Save <hotel>", "Remove <hotel>") | XS | | ✅ Fixed (M4) |
| F-F5 | `SavedHotelIcon` prop type `Number` vs UUID | S4 | Change prop type to `String` (same as A-F4) | XS | | ✅ Fixed (M4) |

## Notes

- Backend needs no change — all findings are client presentation/behaviour.
- F-F1/F-F2 are the priority (misleading data + broken visual state).
- Consider whether "Share the list"/"Create a list" are planned; if not, remove to avoid dead UI.
