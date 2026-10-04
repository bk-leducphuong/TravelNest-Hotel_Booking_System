const ApiError = require('@utils/ApiError');
const bookingRepository = require('../../infrastructure/booking.repository');

const { formatHotelForLegacyClients, formatRoom } = require('./formatters');

/**
 * Get a specific booking by id, scoped to its buyer.
 *
 * @param {number|string} bookingId
 * @param {number} userId
 * @returns {Promise<object>}
 */
async function getBookingById(bookingId, userId) {
  const booking = await bookingRepository.findByIdAndBuyerId(bookingId, userId);

  if (!booking) {
    throw new ApiError(
      404,
      'BOOKING_NOT_FOUND',
      'Booking not found or you do not have permission to view it'
    );
  }

  const hotel = await bookingRepository.findHotelById(booking.hotel_id);
  const room = await bookingRepository.findRoomById(booking.room_id);

  const bookingData = booking.toJSON ? booking.toJSON() : booking;

  return {
    ...bookingData,
    hotel: formatHotelForLegacyClients(hotel),
    room: formatRoom(room),
  };
}

module.exports = { getBookingById };
