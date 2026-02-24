const { Op } = require('sequelize');

const { Reviews, ReviewCriterias, Hotels, Bookings } = require('../models/index.js');

/**
 * Review Repository - Contains all database operations for reviews
 * Only repositories may import Sequelize models
 */

class ReviewRepository {
  /**
   * Find booking by booking code, buyer ID, and hotel ID
   */
  async findBookingByCode(bookingCode, buyerId, hotelId) {
    return await Bookings.findOne({
      where: {
        booking_code: bookingCode,
        buyer_id: buyerId,
        hotel_id: hotelId,
        status: 'completed',
      },
    });
  }

  /**
   * Find review by booking code and hotel ID
   */
  async findReviewByBookingCode(bookingCode, hotelId) {
    return await Reviews.findOne({
      where: {
        booking_code: bookingCode,
        hotel_id: hotelId,
      },
      include: [
        {
          model: ReviewCriterias,
          attributes: ['criteria_name', 'score'],
        },
      ],
    });
  }

  /**
   * Find review by ID
   */
  async findById(reviewId) {
    return await Reviews.findOne({
      where: { review_id: reviewId },
      include: [
        {
          model: ReviewCriterias,
          attributes: ['criteria_name', 'score'],
        },
      ],
    });
  }

  /**
   * Create review
   */
  async createReview(reviewData) {
    return await Reviews.create({
      user_id: reviewData.userId,
      hotel_id: reviewData.hotelId,
      rating: reviewData.rating,
      comment: reviewData.comment,
      booking_code: reviewData.bookingCode,
      booking_id: reviewData.bookingId,
    });
  }

  /**
   * Create review criteria
   */
  async createReviewCriteria(reviewId, criteriaName, score) {
    return await ReviewCriterias.create({
      review_id: reviewId,
      criteria_name: criteriaName,
      score,
    });
  }

  /**
   * Find all reviews for a user (via bookings)
   */
  async findReviewsByUserId(userId) {
    return await Bookings.findAll({
      where: {
        buyer_id: userId,
        status: 'completed',
      },
      attributes: ['hotel_id', 'booking_code'],
      include: [
        {
          model: Hotels,
          attributes: ['id', 'name', 'image_urls'],
        },
        {
          model: Reviews,
          attributes: [
            'review_id',
            'rating',
            'comment',
            'created_at',
            'reply',
            'number_of_likes',
            'number_of_dislikes',
          ],
        },
      ],
      group: ['hotel_id', 'booking_code'],
    });
  }

  /**
   * Find reviews by hotel ID
   */
  async findReviewsByHotelId(hotelId, options = {}) {
    const { limit, offset } = options;

    return await Reviews.findAndCountAll({
      where: { hotel_id: hotelId },
      attributes: [
        'review_id',
        'user_id',
        'rating',
        'comment',
        'created_at',
        'booking_code',
        'reply',
        'number_of_likes',
        'number_of_dislikes',
      ],
      include: [
        {
          model: ReviewCriterias,
          attributes: ['criteria_name', 'score'],
        },
      ],
      limit: limit || undefined,
      offset: offset || undefined,
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Update review by ID
   */
  async updateReviewById(reviewId, updateData) {
    return await Reviews.update(updateData, {
      where: { review_id: reviewId },
    });
  }

  /**
   * Delete review by ID
   */
  async deleteReviewById(reviewId) {
    return await Reviews.destroy({
      where: { review_id: reviewId },
    });
  }
}

module.exports = new ReviewRepository();
