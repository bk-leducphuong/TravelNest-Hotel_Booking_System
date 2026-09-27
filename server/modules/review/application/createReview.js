const ApiError = require('@utils/ApiError');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const bookingModule = require('@modules/booking');

const reviewRepository = require('../infrastructure/review.repository');
const { MIN_RATING, MAX_RATING } = require('../domain/rating-summary');

const CRITERIA_KEYS = ['cleanliness', 'location', 'service', 'value'];

function normalizeRating(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_RATING || parsed > MAX_RATING) {
    throw new ApiError(400, 'INVALID_RATING', `${field} must be between 1 and 10`);
  }
  // Stored as DECIMAL(3,1)
  return Math.round(parsed * 10) / 10;
}

/**
 * Create a review for a completed booking.
 *
 * Post-moderation policy: the review is published immediately.
 */
async function createReview(userId, { hotelId, bookingCode, ratings, title, comment }) {
  if (!hotelId || !bookingCode) {
    throw new ApiError(400, 'MISSING_REQUIRED_FIELDS', 'hotelId and bookingCode are required');
  }
  if (!ratings || typeof ratings !== 'object') {
    throw new ApiError(400, 'MISSING_REVIEW_RATINGS', 'ratings object is required');
  }
  if (!comment || !String(comment).trim()) {
    throw new ApiError(400, 'MISSING_REVIEW_COMMENT', 'comment is required');
  }

  const normalizedRatings = { overall: normalizeRating(ratings.overall, 'ratings.overall') };
  for (const key of CRITERIA_KEYS) {
    if (ratings[key] !== undefined && ratings[key] !== null) {
      normalizedRatings[key] = normalizeRating(ratings[key], `ratings.${key}`);
    }
  }

  // Eligibility is owned by the Booking module - we only use its public interface.
  const booking = await bookingModule.getCompletedBookingForReview({
    bookingCode,
    buyerId: userId,
    hotelId,
  });

  if (!booking) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found or not eligible for review');
  }

  const existingReview = await reviewRepository.findByBookingId(booking.id);
  if (existingReview) {
    throw new ApiError(409, 'REVIEW_ALREADY_EXISTS', 'This booking has already been reviewed');
  }

  const review = await reviewRepository.create({
    userId,
    hotelId,
    bookingId: booking.id,
    ratings: normalizedRatings,
    title: title ? String(title).trim() : null,
    comment: String(comment).trim(),
    status: 'published',
    isVerified: true,
  });

  await eventBus.publish(DOMAIN_EVENTS.REVIEW_CREATED, {
    reviewId: review.id,
    hotelId,
    userId,
  });

  return { reviewId: review.id, status: review.status };
}

module.exports = { createReview };
