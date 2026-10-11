# J — Reviews (Guest): Browser evidence (Playwright)

Authenticated as **Test User**, `http://localhost:5173`, 2026-10-09. A `completed` test booking
existed for the run (reverted afterwards).

## J-F1 — My-reviews page crashes on the response shape

`/reviews` with 1 review present (API `GET /reviews` returns it):

- Nav counters: **"All reviews 0 / Not reviewed yet 0 / Reviewed 0"**; right pane shows the empty
  state "No reviews yet".
- Console:

```
[Vue warn]: Unhandled error during execution of watcher callback
[Vue warn]: Unhandled error during execution of render function
TypeError: Cannot read properties of undefined (reading 'length')   (x2)
```

`Reviews.vue`:

```js
// watcher
this.reviews.forEach((review) => { if (review.review.length == 0) ... })
// template
<h4 v-if="review.review.length == 0">You haven't reviewed your stay at {{ review.hotel.name }}</h4>
<img :src="getFirstImageUrl(review.hotel.image_urls)" />
```

API item keys (no matches for `review.review` / `booking_code` / `hotel.image_urls`):

```
['id','hotel_id','booking_id','rating_overall','title','comment','status',
 'is_verified','helpful_count','created_at','updated_at','hotel','user','reply','media']
```

## J-F2 — Submission UI calls dead endpoints

```
POST /api/review/validate-review        -> 404
POST /api/review/post-review            -> 404
POST /api/review/check-already-reviewed -> 404
```

Referenced in `ReviewDetails.vue` (lines 52/74/104), `ReviewForm.vue` (line 23),
`ReviewValidation.vue` (line 29). `ReviewService.createReview()` (`POST /reviews`) is unused.

Navigating to `/reviews/review-details?bc=…&hid=…&hn=…` **redirects to `/reviews`** (its
`validateReview()` call hits the 404 above), so the form never renders.

## J-F4 — placeholder name

Header shows **"User Name"** rather than "Test User".
