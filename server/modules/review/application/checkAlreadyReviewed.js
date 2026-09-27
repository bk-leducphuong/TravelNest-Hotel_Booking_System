const bookingModule = require('@modules/booking');

const reviewRepository = require('../infrastructure/review.repository');

/**
 * Check whether the (completed) booking has already been reviewed.
 */
async function checkAlreadyReviewed(userId, { bookingCode, hotelId }) {
  const booking = await bookingModule.getCompletedBookingForReview({
    bookingCode,
    buyerId: userId,
    hotelId,
  });

  if (!booking) {
    return { exists: false };
  }

  const review = await reviewRepository.findByBookingId(booking.id);

  if (!review) {
    return { exists: false };
  }

  return {
    exists: true,
    review: {
      review_id: review.id,
      rating: parseFloat(review.rating_overall),
      title: review.title,
      comment: review.comment,
      status: review.status,
      created_at: review.created_at,
    },
  };
}

module.exports = { checkAlreadyReviewed };
