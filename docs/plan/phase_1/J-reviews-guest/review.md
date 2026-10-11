# J — Reviews (Guest): Review

Date: 2026-10-09 · Environment: local dev stack, authenticated as Test User.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/browser.md`](./test-results/browser.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| J-F1 | **S2** | UI/UX (contract) | **The "My reviews" page is broken.** With reviews present, `/reviews` shows "All reviews 0 / Not reviewed yet 0 / Reviewed 0" and renders nothing; console shows `TypeError: Cannot read properties of undefined (reading 'length')` in a **watcher** and the **render function**. | `Reviews.vue` expects a legacy per-booking shape — `review.review.length`, `review.booking_code`, `review.hotel.image_urls`, `review.hotel.hotel_id` — but `GET /reviews` returns flat review objects `{id, hotel_id, hotel, comment, …}` with no nested `review`/`booking_code`/`image_urls`. | browser.md | ✅ Fixed (M3) |
| J-F2 | **S2** | UI/UX | **The review submission UI is dead.** `ReviewDetails.vue`, `ReviewForm.vue`, `ReviewValidation.vue` POST to **`/api/review/validate-review`**, **`/api/review/post-review`**, **`/api/review/check-already-reviewed`** — all **404**. The working `ReviewService` (`POST /reviews`, `GET /reviews/validate|check`) is not used. The `/reviews/review-details` page redirects back to `/reviews`. | Client not migrated to the review module API. | browser.md | ✅ Fixed (M3) |
| J-F3 | S3 | API/contract | Reviewing a booking that exists but is **not eligible** (not completed) returns `404 BOOKING_NOT_FOUND` (message "…or not eligible for review"). For a booking the caller owns, a `409`/`422 "not eligible"` is more accurate. | Eligibility and not-found share one error. | api.md J-API-11/13 | ✅ Fixed (M4) |
| J-F4 | S3 | UI/UX | The reviews page header shows the placeholder **"User Name"** instead of the signed-in user's name. | `getUserInformation.username` not populated. | browser.md | ✅ Fixed (M4) |

## Positives

- **API is correct and safe**: create `201` (`published`, `is_verified:true`), duplicate →
  `409 REVIEW_ALREADY_EXISTS`, no token → `401`.
- **Eligibility enforced**: a non-completed booking, another user's completed booking, and
  User B validating User A's booking all → `404` (no leak, no bypass).
- **Validation**: missing `comment` → `400`; `ratings.overall=11` → `400`.
- Public hotel reviews list with user info; `GET /reviews` (mine) is scoped and paginated;
  envelope `{data, meta}` consistent.
- `review.created` → rating-summary projection (module event) is exercised on create.

## Notes

- Test fixture: a `confirmed` booking was temporarily flipped to `completed` in the DB to test
  the happy path, then **reverted**; all test reviews were deleted.

## Verdict

**🟡 Partial (S2 blockers).** The review **API is production-quality** — this is the best-covered
guest surface on the backend. But the **client review experience is entirely broken**: the
My-reviews page crashes on the response shape (J-F1) and the submission form targets endpoints
that no longer exist (J-F2). Both are client migrations after the module refactor.

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
