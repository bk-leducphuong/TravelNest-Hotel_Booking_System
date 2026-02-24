const adminReviewService = require('@services/admin/review.service');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Admin Review Controller - HTTP ↔ business logic mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/admin/reviews
 * Get all reviews for a specific hotel
 */
const getAllReviews = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, hasReply, minRating, maxRating, page, limit } = req.query;

  const result = await adminReviewService.getAllReviews(hotelId, ownerId, {
    hasReply: hasReply === 'true' ? true : hasReply === 'false' ? false : undefined,
    minRating: minRating ? parseFloat(minRating) : undefined,
    maxRating: maxRating ? parseFloat(maxRating) : undefined,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.status(200).json({
    data: result.reviews,
    statistics: result.statistics,
    pagination: result.pagination,
  });
});

/**
 * GET /api/admin/reviews/:reviewId
 * Get a specific review by ID
 */
const getReviewById = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { reviewId } = req.params;

  const review = await adminReviewService.getReviewById(parseInt(reviewId, 10), ownerId);

  res.status(200).json({
    data: review,
  });
});

/**
 * POST /api/admin/reviews/:reviewId/reply
 * Reply to a review
 */
const replyToReview = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { reviewId } = req.params;
  const { reply } = req.body;

  const review = await adminReviewService.replyToReview(parseInt(reviewId, 10), ownerId, reply);

  res.status(201).json({
    data: review,
    message: 'Reply added successfully',
  });
});

/**
 * PATCH /api/admin/reviews/:reviewId/reply
 * Update a reply to a review
 */
const updateReply = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { reviewId } = req.params;
  const { reply } = req.body;

  const review = await adminReviewService.updateReply(parseInt(reviewId, 10), ownerId, reply);

  res.status(200).json({
    data: review,
    message: 'Reply updated successfully',
  });
});

/**
 * DELETE /api/admin/reviews/:reviewId/reply
 * Delete a reply to a review
 */
const deleteReply = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { reviewId } = req.params;

  const review = await adminReviewService.deleteReply(parseInt(reviewId, 10), ownerId);

  res.status(200).json({
    data: review,
    message: 'Reply deleted successfully',
  });
});

module.exports = {
  getAllReviews,
  getReviewById,
  replyToReview,
  updateReply,
  deleteReply,
};
