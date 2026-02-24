const { Op } = require('sequelize');

const { Reviews, ReviewCriterias, Users, Hotels } = require('../../models/index.js');

/**
 * Admin Review Repository - Contains all database operations for admin review management
 * Only repositories may import Sequelize models
 */

class AdminReviewRepository {
  /**
   * Find all reviews for a hotel with optional filters
   */
  async findByHotelId(hotelId, options = {}) {
    const { hasReply, minRating, maxRating, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const where = {
      hotel_id: hotelId,
    };

    // Filter by reply status
    if (hasReply === true) {
      where.reply = { [Op.ne]: null };
    } else if (hasReply === false) {
      where.reply = null;
    }

    // Filter by rating range
    if (minRating !== undefined) {
      where.rating = { ...where.rating, [Op.gte]: minRating };
    }
    if (maxRating !== undefined) {
      where.rating = { ...where.rating, [Op.lte]: maxRating };
    }

    const { count, rows } = await Reviews.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      reviews: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Find review by ID
   */
  async findById(reviewId) {
    return await Reviews.findOne({
      where: { review_id: reviewId },
    });
  }

  /**
   * Find review by ID and hotel ID (for authorization)
   */
  async findByIdAndHotelId(reviewId, hotelId) {
    return await Reviews.findOne({
      where: {
        review_id: reviewId,
        hotel_id: hotelId,
      },
    });
  }

  /**
   * Find user by ID
   */
  async findUserById(userId) {
    return await Users.findOne({
      where: { id: userId },
      attributes: ['id', 'username', 'email', 'profile_picture_url'],
    });
  }

  /**
   * Find review criteria for a review
   */
  async findReviewCriteria(reviewId) {
    return await ReviewCriterias.findAll({
      where: { review_id: reviewId },
      attributes: ['criteria_name', 'score'],
    });
  }

  /**
   * Update review reply
   */
  async updateReply(reviewId, reply) {
    return await Reviews.update(
      { reply },
      {
        where: { review_id: reviewId },
      }
    );
  }

  /**
   * Delete review reply
   */
  async deleteReply(reviewId) {
    return await Reviews.update(
      { reply: null },
      {
        where: { review_id: reviewId },
      }
    );
  }

  /**
   * Verify hotel ownership
   */
  async verifyHotelOwnership(hotelId, ownerId) {
    const hotel = await Hotels.findOne({
      where: {
        id: hotelId,
        owner_id: ownerId,
      },
    });
    return !!hotel;
  }

  /**
   * Get review statistics for a hotel
   */
  async getReviewStatistics(hotelId) {
    const reviews = await Reviews.findAll({
      where: { hotel_id: hotelId },
      attributes: ['rating', 'reply'],
    });

    const totalReviews = reviews.length;
    const reviewsWithReply = reviews.filter((r) => r.reply !== null).length;
    const averageRating =
      reviews.reduce((sum, r) => sum + parseFloat(r.rating), 0) / totalReviews || 0;

    // Rating distribution
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      totalReviews,
      reviewsWithReply,
      reviewsWithoutReply: totalReviews - reviewsWithReply,
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingDistribution,
    };
  }
}

module.exports = new AdminReviewRepository();
