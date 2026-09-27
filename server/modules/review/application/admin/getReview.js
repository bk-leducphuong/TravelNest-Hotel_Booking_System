const ApiError = require('@utils/ApiError');

const reviewRepository = require('../../infrastructure/review.repository');

async function getReview(reviewId) {
  const review = await reviewRepository.findById(reviewId);

  if (!review) {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
  }

  return review;
}

module.exports = { getReview };
