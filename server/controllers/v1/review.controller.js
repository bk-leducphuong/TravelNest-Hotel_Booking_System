const reviewService = require('@services/review.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Review Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/reviews
 * Get all reviews for authenticated user
 */
const getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;

  const reviews = await reviewService.getUserReviews(userId);

  res.status(200).json({
    data: reviews,
  });
});

/**
 * GET /api/reviews/hotels/:hotelId
 * Get reviews for a specific hotel
 */
const getHotelReviews = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { page, limit } = req.query;

  const result = await reviewService.getHotelReviews(hotelId, {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
  });

  res.status(200).json({
    data: result.reviews,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  });
});

/**
 * POST /api/reviews
 * Create a review
 */
const createReview = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { hotelId, rating, comment, reviewCriteria, bookingCode } = req.body;

  const review = await reviewService.createReview(userId, {
    hotelId,
    rating,
    comment,
    reviewCriteria,
    bookingCode,
  });

  res.status(201).json({
    data: {
      review_id: review.review_id,
      message: review.message,
    },
  });
});

/**
 * GET /api/reviews/validate
 * Validate if user can review a booking
 */
const validateReview = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { bookingCode, hotelId } = req.query;

  const result = await reviewService.validateReview(userId, bookingCode, hotelId);

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/reviews/check
 * Check if booking has already been reviewed
 */
const checkAlreadyReviewed = asyncHandler(async (req, res) => {
  const { bookingCode, hotelId } = req.query;

  const review = await reviewService.checkAlreadyReviewed(bookingCode, hotelId);

  if (review) {
    res.status(200).json({
      data: {
        exists: true,
        review,
      },
    });
  } else {
    res.status(200).json({
      data: {
        exists: false,
      },
    });
  }
});

module.exports = {
  getUserReviews,
  getHotelReviews,
  createReview,
  validateReview,
  checkAlreadyReviewed,
};
