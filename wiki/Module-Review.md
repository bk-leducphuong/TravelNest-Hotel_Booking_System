# Review & Moderation Module

`server/modules/review` owns reviews and moderation. This is the first module built on
the [Modular Monolith](Modular-Monolith) pattern and the reference for the others.

## Ownership

| Table | Notes |
|---|---|
| `reviews` | Canonical review; ratings are 1–10 (`rating_overall` + criteria columns) |
| `review_replies` | One reply per review (hotel owner/manager) |
| `review_media` | Review photos/videos (read-supported; write API is a follow-up) |
| `review_helpful_votes` | Helpful votes (model present; API is a follow-up) |
| `hotel_rating_summaries` | Rating projection owned by this module |

Models live in `modules/review/infrastructure/models/` and are loaded by the
[module-aware registry](Modular-Monolith#model-registry).

## Policy

**Post-moderation.** A review is published immediately; moderators can hide or delete it.

```
create  ──► published
published ⇄ hidden        (moderator)
published | hidden ──► deleted   (terminal, soft delete)
```

The state machine lives in `domain/review-status.js`; `assertTransition` rejects invalid
transitions with `409 INVALID_REVIEW_STATUS_TRANSITION`.

Review eligibility is owned by the **Booking** module: the module calls
`@modules/booking` → `getCompletedBookingForReview({ bookingCode, buyerId, hotelId })`.
It never imports Booking internals.

## Guest API — `/api/v1/reviews`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/hotels/:hotelId` | optional (public) | Published reviews for a hotel |
| GET | `/` | bearer | Reviews authored by the current user |
| GET | `/validate` | bearer | Check the user can review a booking |
| GET | `/check` | bearer | Check a booking was already reviewed |
| POST | `/` | bearer | Create a review for a completed booking |

Create body (note UUIDs and the 1–10 `ratings` object):

```json
{
  "hotelId": "019c…",
  "bookingCode": "TN-8F2K1Q",
  "ratings": { "overall": 9.5, "cleanliness": 9, "location": 10, "service": 9, "value": 8 },
  "title": "Great stay",
  "comment": "Spotless room and friendly staff."
}
```

## Admin API — `/api/v1/admin/reviews`

| Method | Path | Permission |
|---|---|---|
| GET | `/` | `review.read` |
| GET | `/summary` | `review.read` |
| GET | `/:reviewId` | `review.read` |
| PATCH | `/:reviewId/status` | `review.moderate` |
| POST | `/:reviewId/reply` | `review.reply` |
| PATCH | `/:reviewId/reply` | `review.reply` |
| DELETE | `/:reviewId/reply` | `review.reply` |

Queue filters: `status`, `hotelId`, `minRating`, `maxRating`, `hasReply`, `q`, `page`, `limit`.

Moderation action:

```http
PATCH /api/v1/admin/reviews/:reviewId/status
{ "status": "hidden", "reason": "spam" }
```

## Events & audit

- Emits `review.created`, `review.status_changed`, `review.replied`.
- The subscriber recomputes `hotel_rating_summaries` (1–10 buckets) and refreshes the
  search snapshot via `emitReviewCreated`, so storefront ratings stay current.
- Every status change / reply writes an `audit_logs` entry (`review.status_changed`,
  `review.replied`, …).

## Files

```
modules/review/
  domain/review-status.js
  domain/rating-summary.js
  infrastructure/review.repository.js
  infrastructure/rating-summary.repository.js
  application/{createReview,listHotelReviews,listUserReviews,validateReviewEligibility,checkAlreadyReviewed,recomputeHotelRatingSummary}.js
  application/admin/{listReviews,getReview,setReviewStatus,replyToReview,getReviewSummary}.js
  api/{schemas,guest.controller,guest.routes,admin.controller,admin.routes}.js
  events/subscribers.js
  index.js
```

## Tests

`__tests__/unit/modules/review/domain/` — state machine and rating-projection math.

## Migrations

- `20260921000100-add-review-moderation-index.js` — `reviews(status, created_at)` for the
  global moderation queue.

## Follow-ups

- Helpful-vote and review-media write endpoints.
- Hotel-scoped permission check on reply (`requireHotelContext`).
- Notifications for new reviews / replies (`REVIEW_NEW`, `REVIEW_RESPONSE` types exist).
