const reviewRepository = require('../infrastructure/review.repository');

/**
 * Public, paginated list of published reviews for a hotel.
 */
async function listHotelReviews(hotelId, { page = 1, limit = 20 } = {}) {
  const result = await reviewRepository.findPublishedByHotel(hotelId, { page, limit });

  return {
    reviews: result.rows,
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 20, 100),
    total: result.count,
  };
}

module.exports = { listHotelReviews };
