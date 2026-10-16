const reviewRepository = require('../infrastructure/review.repository');

const MAX_LIMIT = 100;

/**
 * Accepts `"3,4,5"`, `[3, 4, 5]` or `["3", "4", "5"]` and returns the unique
 * month numbers in the 1-12 range.
 */
function normalizeMonths(months) {
  if (months === undefined || months === null || months === '') return undefined;

  const list = Array.isArray(months) ? months : String(months).split(',');
  const parsed = list
    .map((value) => parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12);

  return parsed.length > 0 ? [...new Set(parsed)] : undefined;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value) {
  return value === true || value === 'true';
}

/**
 * Sequelize instances must be mutated through `setDataValue` to be serialised.
 */
function attachViewerVote(review, vote) {
  if (typeof review.setDataValue === 'function') {
    review.setDataValue('viewerHelpfulVote', vote);
  } else {
    review.viewerHelpfulVote = vote;
  }
}

/**
 * Public, paginated and filterable list of published reviews for a hotel.
 *
 * When `viewerId` is provided, each review carries `viewerHelpfulVote`
 * (`true`/`false`/`null`) so the UI can highlight the caller's own vote.
 */
async function listHotelReviews(
  hotelId,
  { page = 1, limit = 20, minRating, maxRating, months, country, hasMedia, q, viewerId } = {}
) {
  const filters = {
    page,
    limit,
    minRating: toNumber(minRating),
    maxRating: toNumber(maxRating),
    months: normalizeMonths(months),
    country: typeof country === 'string' && country.trim() ? country.trim() : undefined,
    hasMedia: toBoolean(hasMedia),
    q: typeof q === 'string' && q.trim() ? q.trim() : undefined,
  };

  const [result, countries] = await Promise.all([
    reviewRepository.findPublishedByHotel(hotelId, filters),
    reviewRepository.findCountryFacetsByHotel(hotelId),
  ]);

  const reviews = result.rows;

  if (viewerId && reviews.length > 0) {
    const votes = await reviewRepository.findVotesByReviewIds(
      reviews.map((review) => review.id),
      viewerId
    );
    const byReview = new Map(votes.map((vote) => [vote.review_id, vote.is_helpful]));

    reviews.forEach((review) => {
      attachViewerVote(review, byReview.has(review.id) ? byReview.get(review.id) : null);
    });
  }

  return {
    reviews,
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 20, MAX_LIMIT),
    total: result.count,
    facets: { countries },
  };
}

module.exports = { listHotelReviews, normalizeMonths };
