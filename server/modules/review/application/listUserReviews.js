const reviewRepository = require('../infrastructure/review.repository');

/**
 * Reviews authored by the authenticated user (all statuses, so they can see
 * when a moderator hides something).
 */
async function listUserReviews(userId, { page = 1, limit = 20 } = {}) {
  const result = await reviewRepository.findByUser(userId, { page, limit });

  return {
    reviews: result.rows,
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 20, 100),
    total: result.count,
  };
}

module.exports = { listUserReviews };
