const reviewRepository = require('../infrastructure/review.repository');
const ratingSummaryRepository = require('../infrastructure/rating-summary.repository');
const { buildSummary } = require('../domain/rating-summary');

/**
 * Recompute the `hotel_rating_summaries` projection for one hotel from the
 * canonical set of published reviews. This is the review module's read model;
 * storefront/search read it instead of joining reviews.
 */
async function recomputeHotelRatingSummary(hotelId, options = {}) {
  const rows = await reviewRepository.findPublishedRatingRows(hotelId, options);
  const summary = buildSummary(rows);
  await ratingSummaryRepository.upsert(hotelId, summary, options);
  return summary;
}

module.exports = { recomputeHotelRatingSummary };
