const adminReviewRepository = require('../../repositories/admin/review.repository');
const ApiError = require('../../utils/ApiError');

/**
 * Admin Review Service - Contains main business logic for admin review management
 * Follows RESTful API standards
 */

class AdminReviewService {
  /**
   * Verify hotel ownership for all operations
   */
  async verifyAccess(hotelId, ownerId) {
    const isOwner = await adminReviewRepository.verifyHotelOwnership(hotelId, ownerId);

    if (!isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this hotel');
    }
  }

  /**
   * Get all reviews for a specific hotel
   * @param {number} hotelId - Hotel ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated reviews with metadata
   */
  async getAllReviews(hotelId, ownerId, options = {}) {
    await this.verifyAccess(hotelId, ownerId);

    const result = await adminReviewRepository.findByHotelId(hotelId, options);

    // Enrich reviews with user information and criteria
    const enrichedReviews = await Promise.all(
      result.reviews.map(async (review) => {
        const reviewData = review.toJSON ? review.toJSON() : review;

        // Get user information
        const user = await adminReviewRepository.findUserById(reviewData.user_id);

        // Get review criteria
        const criteria = await adminReviewRepository.findReviewCriteria(reviewData.review_id);

        return {
          ...reviewData,
          user: user ? (user.toJSON ? user.toJSON() : user) : null,
          criteria: criteria.map((c) => (c.toJSON ? c.toJSON() : c)),
        };
      })
    );

    // Get review statistics
    const statistics = await adminReviewRepository.getReviewStatistics(hotelId);

    return {
      reviews: enrichedReviews,
      statistics,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: options.limit || 20,
      },
    };
  }

  /**
   * Get a specific review by ID
   * @param {number} reviewId - Review ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @returns {Promise<Object>} Review details
   */
  async getReviewById(reviewId, ownerId) {
    const review = await adminReviewRepository.findById(reviewId);

    if (!review) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    }

    // Verify hotel ownership
    await this.verifyAccess(review.hotel_id, ownerId);

    const reviewData = review.toJSON ? review.toJSON() : review;

    // Get user information
    const user = await adminReviewRepository.findUserById(reviewData.user_id);

    // Get review criteria
    const criteria = await adminReviewRepository.findReviewCriteria(reviewData.review_id);

    return {
      ...reviewData,
      user: user ? (user.toJSON ? user.toJSON() : user) : null,
      criteria: criteria.map((c) => (c.toJSON ? c.toJSON() : c)),
    };
  }

  /**
   * Reply to a review
   * @param {number} reviewId - Review ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @param {string} reply - Reply text
   * @returns {Promise<Object>} Updated review
   */
  async replyToReview(reviewId, ownerId, reply) {
    const review = await adminReviewRepository.findById(reviewId);

    if (!review) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    }

    // Verify hotel ownership
    await this.verifyAccess(review.hotel_id, ownerId);

    // Check if already has a reply
    if (review.reply) {
      throw new ApiError(
        400,
        'REPLY_EXISTS',
        'This review already has a reply. Use PATCH to update it.'
      );
    }

    // Add reply
    const [updatedCount] = await adminReviewRepository.updateReply(reviewId, reply);

    if (updatedCount === 0) {
      throw new ApiError(500, 'UPDATE_FAILED', 'Failed to add reply');
    }

    // Return updated review
    return await this.getReviewById(reviewId, ownerId);
  }

  /**
   * Update a reply to a review
   * @param {number} reviewId - Review ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @param {string} reply - Updated reply text
   * @returns {Promise<Object>} Updated review
   */
  async updateReply(reviewId, ownerId, reply) {
    const review = await adminReviewRepository.findById(reviewId);

    if (!review) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    }

    // Verify hotel ownership
    await this.verifyAccess(review.hotel_id, ownerId);

    // Check if has a reply to update
    if (!review.reply) {
      throw new ApiError(
        400,
        'NO_REPLY',
        'This review does not have a reply to update. Use POST to add a reply.'
      );
    }

    // Update reply
    const [updatedCount] = await adminReviewRepository.updateReply(reviewId, reply);

    if (updatedCount === 0) {
      throw new ApiError(500, 'UPDATE_FAILED', 'Failed to update reply');
    }

    // Return updated review
    return await this.getReviewById(reviewId, ownerId);
  }

  /**
   * Delete a reply to a review
   * @param {number} reviewId - Review ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @returns {Promise<Object>} Updated review
   */
  async deleteReply(reviewId, ownerId) {
    const review = await adminReviewRepository.findById(reviewId);

    if (!review) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    }

    // Verify hotel ownership
    await this.verifyAccess(review.hotel_id, ownerId);

    // Check if has a reply to delete
    if (!review.reply) {
      throw new ApiError(400, 'NO_REPLY', 'This review does not have a reply to delete');
    }

    // Delete reply
    const [updatedCount] = await adminReviewRepository.deleteReply(reviewId);

    if (updatedCount === 0) {
      throw new ApiError(500, 'DELETE_FAILED', 'Failed to delete reply');
    }

    // Return updated review
    return await this.getReviewById(reviewId, ownerId);
  }
}

module.exports = new AdminReviewService();
