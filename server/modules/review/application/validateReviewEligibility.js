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
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found or not eligible for review');
  }

  return {
    bookingCode,
    bookingId: booking.id,
    isValid: true,
  };
}

module.exports = { validateReviewEligibility };
