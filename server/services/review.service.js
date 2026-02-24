const reviewRepository = require('../repositories/review.repository');
const ApiError = require('../utils/ApiError');

/**
 * Review Service - Contains main business logic
 * Follows RESTful API standards
 */

class ReviewService {
  /**
   * Validate if user can review a booking
   * @param {number} userId - User ID
   * @param {string} bookingCode - Booking code
   * @param {number} hotelId - Hotel ID
   * @returns {Promise<Object>} Booking validation result
   */
  async validateReview(userId, bookingCode, hotelId) {
    if (!bookingCode || !hotelId) {
      throw new ApiError(400, 'MISSING_PARAMETERS', 'bookingCode and hotelId are required');
    }

    const booking = await reviewRepository.findBookingByCode(bookingCode, userId, hotelId);

    if (!booking) {
      throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found or not eligible for review');
    }

    return {
      bookingCode,
      bookingId: booking.id,
      isValid: true,
    };
  }

  /**
   * Check if booking has already been reviewed
   * @param {string} bookingCode - Booking code
   * @param {number} hotelId - Hotel ID
   * @returns {Promise<Object|null>} Review if exists, null otherwise
   */
  async checkAlreadyReviewed(bookingCode, hotelId) {
    if (!bookingCode || !hotelId) {
      throw new ApiError(400, 'MISSING_PARAMETERS', 'bookingCode and hotelId are required');
    }

    const review = await reviewRepository.findReviewByBookingCode(bookingCode, hotelId);

    if (!review) {
      return null;
    }

    return {
      review_id: review.review_id,
      rating: parseFloat(review.rating),
      comment: review.comment,
      created_at: review.created_at,
      reply: review.reply,
      number_of_likes: review.number_of_likes || 0,
      number_of_dislikes: review.number_of_dislikes || 0,
      review_criteria: review.ReviewCriterias
        ? review.ReviewCriterias.map((criteria) => ({
            criteria_name: criteria.criteria_name,
            score: criteria.score,
          }))
        : [],
    };
  }

  /**
   * Create a review
   * @param {number} userId - User ID
   * @param {Object} reviewData - Review data
   * @param {number} reviewData.hotelId - Hotel ID
   * @param {number} reviewData.rating - Overall rating (1-5)
   * @param {string} reviewData.comment - Review comment
   * @param {Array} reviewData.reviewCriteria - Array of criteria scores
   * @param {string} reviewData.bookingCode - Booking code
   * @returns {Promise<Object>} Created review
   */
  async createReview(userId, reviewData) {
    const { hotelId, rating, comment, reviewCriteria, bookingCode } = reviewData;

    // Validate required fields
    if (!hotelId || !rating || !comment || !reviewCriteria || !bookingCode) {
      throw new ApiError(
        400,
        'MISSING_REQUIRED_FIELDS',
        'hotelId, rating, comment, reviewCriteria, and bookingCode are required'
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      throw new ApiError(400, 'INVALID_RATING', 'Rating must be between 1 and 5');
    }

    // Validate booking exists and belongs to user
    const booking = await reviewRepository.findBookingByCode(bookingCode, userId, hotelId);

    if (!booking) {
      throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found or not eligible for review');
    }

    // Check if already reviewed
    const existingReview = await reviewRepository.findReviewByBookingCode(bookingCode, hotelId);

    if (existingReview) {
      throw new ApiError(409, 'REVIEW_ALREADY_EXISTS', 'This booking has already been reviewed');
    }

    // Validate review criteria
    if (!Array.isArray(reviewCriteria) || reviewCriteria.length === 0) {
      throw new ApiError(
        400,
        'INVALID_REVIEW_CRITERIA',
        'reviewCriteria must be a non-empty array'
      );
    }

    // Create review
    const review = await reviewRepository.createReview({
      userId,
      hotelId,
      rating: parseFloat(rating),
      comment: comment.trim(),
      bookingCode,
      bookingId: booking.id,
    });

    // Create review criteria
    const criteriaPromises = reviewCriteria
      .filter((criteria) => criteria.value && criteria.name)
      .map((criteria) =>
        reviewRepository.createReviewCriteria(
          review.review_id,
          criteria.name,
          parseInt(criteria.value, 10)
        )
      );

    await Promise.all(criteriaPromises);

    return {
      review_id: review.review_id,
      message: 'Review posted successfully',
    };
  }

  /**
   * Get all reviews for a user (via their bookings)
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of bookings with reviews
   */
  async getUserReviews(userId) {
    const bookings = await reviewRepository.findReviewsByUserId(userId);

    return bookings.map((booking) => {
      const bookingData = booking.toJSON ? booking.toJSON() : booking;
      return {
        hotel_id: bookingData.hotel_id,
        booking_code: bookingData.booking_code,
        hotel: bookingData.hotels || bookingData.Hotel,
        review:
          bookingData.reviews && bookingData.reviews.length > 0 ? bookingData.reviews[0] : null,
      };
    });
  }

  /**
   * Get reviews for a hotel
   * @param {number} hotelId - Hotel ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20, max: 100)
   * @returns {Promise<Object>} Reviews with pagination metadata
   */
  async getHotelReviews(hotelId, options = {}) {
    const { page = 1, limit = 20 } = options;

    // Validate limit
    const validatedLimit = Math.min(limit, 100);
    const offset = (page - 1) * validatedLimit;

    const result = await reviewRepository.findReviewsByHotelId(hotelId, {
      limit: validatedLimit,
      offset,
    });

    return {
      reviews: result.rows.map((review) => {
        const reviewData = review.toJSON ? review.toJSON() : review;
        return {
          ...reviewData,
          review_criteria: reviewData.ReviewCriterias
            ? reviewData.ReviewCriterias.map((criteria) => ({
                criteria_name: criteria.criteria_name,
                score: criteria.score,
              }))
            : [],
        };
      }),
      page,
      limit: validatedLimit,
      total: result.count,
    };
  }
}

module.exports = new ReviewService();
