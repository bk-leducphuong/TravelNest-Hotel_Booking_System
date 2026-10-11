# F — Favorites / Saved Hotels: Browser evidence (Playwright)

Authenticated session (**Test User**), `http://localhost:5173`, 2026-10-09.
Screenshots: `saved-hotels-empty.png`, `saved-hotels-with-item.png`.

## Flow

| Check | Result |
|---|---|
| `/saved-hotels` empty | ✅ "Saved hotels ( 0 properties saved )" / "No saved hotels" |
| Click heart on a search-results card | ✅ `POST /api/v1/user/favorite-hotels => 201` |
| API confirm | ✅ `total=1 [01a105dc-25ae-70fd-bb54-dc27d5d2895c Plaza Marcelino Flats Manor]` |
| `/saved-hotels` after add | ✅ "( 1 properties saved )" → "Plaza Marcelino Flats Manor" |
| Click close (remove) | ✅ `DELETE /api/v1/user/favorite-hotels/… => 204`, count → "( 0 properties saved )", empty state |

## F-F1 — fabricated card data

`SavedHotels.vue` card template (lines 132–151) hardcodes, for **every** hotel:

```html
<img alt="BlackPink HomeStay" ...>
<h3 class="hotel-name">{{ hotel.hotelInformation.name }}</h3>
<div class="star-rating">★★★</div>
<span class="rating">{{ hotel.hotelInformation.overall_rating }}</span>
<span class="review-text">Exceptional · 319 reviews</span>
<div class="distance">2.8 km from centre</div>
```

So a real hotel with a different class/rating/review count shows ★★★, "319 reviews",
"2.8 km", and alt "BlackPink HomeStay". Verified in the DOM.

## F-F2 — heart state never loaded

`SavedHotelIcon.checkFavoriteHotel()` body is entirely commented out:

```js
async checkFavoriteHotel() {
  if (this.isUserAuthenticated) {
    // const response = await UserService.isFavoriteHotel(this.hotelId)
    // this.isFavorite = response?.data?.isFavorite ?? false
  }
}
```

`mounted()` calls it when `useInitialFavoriteStatus` is false (the default) → the heart always
renders empty for already-saved hotels.

## F-F3 — dead header controls

`SavedHotels.vue` header has no `@click` on "Share the list" / "Create a list" / "Show on map",
plus a static trip `<select>` and readonly `1 Feb - 5 Feb` / `1 adult · 1 room` inputs.

## F-F4 — a11y

Search results: 20 `.favorite-button` elements, `getAttribute('aria-label')` → `null` for all.
Saved card: `<button class="close-button"><i class="fa fa-times" aria-hidden="true"></i></button>`
(no accessible name).
