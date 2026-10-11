const ApiError = require('@utils/ApiError');
const bookingModule = require('@modules/booking');

/**
 * Verify the user is allowed to review: they must have a completed booking.
 */
async function validateReviewEligibility(userId, { bookingCode, hotelId }) {
  if (!bookingCode || !hotelId) {
    throw new ApiError(400, 'MISSING_PARAMETERS', 'bookingCode and hotelId are required');
  }

  const booking = await bookingModule.getCompletedBookingForReview({
    bookingCode,
    buyerId: userId,
    hotelId,
  });

  if (!booking) {
    throw new ApiError(
      409,
      'REVIEW_NOT_ELIGIBLE',
      'This booking is not eligible for review (it must be completed and belong to you)'
    );
  }

  return {
    bookingCode,
    bookingId: booking.id,
    isValid: true,
  };
}

module.exports = { validateReviewEligibility };
