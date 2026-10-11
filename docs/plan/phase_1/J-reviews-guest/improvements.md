# J — Reviews (Guest): Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| J-F1 | My-reviews page crashes on response shape | S2 | Rewrite `Reviews.vue` (watcher + template) to consume the API review objects (`comment`, `status`, `hotel`, `hotel_id`, `booking_id`); obtain `booking_code` from the booking/eligibility endpoint if needed | M | | Open |
| J-F2 | Submission UI calls dead endpoints (`/api/review/*`) | S2 | Point `ReviewDetails`/`ReviewForm`/`ReviewValidation` at `ReviewService` (`POST /reviews`, `GET /reviews/validate`, `GET /reviews/check`) with the new body (`hotelId`, `bookingCode`, `ratings{overall,…}`, `comment`) | M | | Open |
| J-F3 | Non-eligible booking returns 404 | S3 | Return `409`/`422` with a distinct code (e.g. `REVIEW_NOT_ELIGIBLE`) when the booking exists but isn't reviewable | S | | Open |
| J-F4 | Reviews page shows "User Name" | S3 | Populate `getUserInformation` / use the real name | XS | | Open |

## Notes

- Backend needs no change beyond J-F3.
- J-F1 + J-F2 are the same class of post-refactor client drift seen in **H (cancellation)** —
  consider a repo-wide sweep for remaining `/api/<legacy>` axios calls.
- Suggested search: `grep -rn "VITE_SERVER_HOST}/api/" client/src` → all should be migrated to
  the `services/*` layer hitting `/api/v1`.
