const reviewRepository = require('../../infrastructure/review.repository');

/**
 * Moderation queue / list. Supports status, hotel, rating range, reply
 * presence and free-text search.
 */
async function listReviews(filters = {}) {
  const result = await reviewRepository.findForModeration(filters);

  return {
    reviews: result.rows,
    page: parseInt(filters.page, 10) || 1,
    limit: Math.min(parseInt(filters.limit, 10) || 20, 100),
    total: result.count,
  };
}

module.exports = { listReviews };
