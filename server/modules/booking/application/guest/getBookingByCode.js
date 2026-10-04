const ApiError = require('@utils/ApiError');
const bookingRepository = require('../../infrastructure/booking.repository');

/**
 * Get a booking by its public booking code, scoped to its buyer.
 *
 * @param {string} bookingCode
 * @param {number} userId
 * @returns {Promise<object>}
 */
async function getBookingByCode(bookingCode, userId) {
  const booking = await bookingRepository.findDetailedByBookingCodeAndBuyerId(bookingCode, userId);

  if (!booking) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  return booking.toJSON ? booking.toJSON() : booking;
}

module.exports = { getBookingByCode };
