/**
 * Pure rating-summary projection.
 *
 * `hotel_rating_summaries` stores an average plus a 1..10 distribution. Bucket
 * boundaries follow the existing schema comments: rating_10 covers 9.50-10.00,
 * rating_9 covers 8.50-9.49, and so on. `Math.round` reproduces those edges.
 */

const MIN_RATING = 1;
const MAX_RATING = 10;

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function bucketForRating(rating) {
  const parsed = Number(rating);
  if (!Number.isFinite(parsed)) {
    return MIN_RATING;
  }
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(parsed)));
}

/**
 * Build a summary from published review rows.
 * @param {Array<{rating_overall: number|string, created_at?: Date|string}>} rows
 */
function buildSummary(rows = []) {
  const summary = {
    total_reviews: 0,
    total_rating_sum: 0,
    overall_rating: 0,
    last_review_date: null,
  };

  for (let score = MIN_RATING; score <= MAX_RATING; score += 1) {
    summary[`rating_${score}`] = 0;
  }

  let count = 0;
  let sum = 0;
  let lastReviewDate = null;

  for (const row of rows) {
    const rating = parseFloat(row.rating_overall);
    if (!Number.isFinite(rating)) {
      continue;
    }

    count += 1;
    sum += rating;
    summary[`rating_${bucketForRating(rating)}`] += 1;

    const createdAt = row.created_at ? new Date(row.created_at) : null;
    if (createdAt && (!lastReviewDate || createdAt > lastReviewDate)) {
      lastReviewDate = createdAt;
    }
  }

  summary.total_reviews = count;
  summary.total_rating_sum = round2(sum);
  summary.overall_rating = count > 0 ? round2(sum / count) : 0;
  summary.last_review_date = lastReviewDate;

  return summary;
}

module.exports = {
  MIN_RATING,
  MAX_RATING,
  bucketForRating,
  buildSummary,
};
