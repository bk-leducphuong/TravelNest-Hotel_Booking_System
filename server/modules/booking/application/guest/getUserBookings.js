const bookingRepository = require('@repositories/booking.repository');

const { formatHotelForLegacyClients, formatRoom } = require('./formatters');

/**
 * Get all bookings for a user, refreshing statuses from the current date first
 * and enriching each row with its hotel and room.
 *
 * @param {number} userId
 * @param {{ includeCancelled?: boolean }} options
 * @returns {Promise<Array<object>>}
 */
async function getUserBookings(userId, options = {}) {
  const { includeCancelled = false } = options;

  // Update booking statuses based on current date
  await bookingRepository.updateStatusByDates(userId);

  // Get bookings
  const bookings = await bookingRepository.findByBuyerId(userId, {
    excludeCancelled: !includeCancelled,
  });

  // Enrich with hotel and room information
  return Promise.all(
    bookings.map(async (booking) => {
      const bookingData = booking.toJSON ? booking.toJSON() : booking;

      const hotel = await bookingRepository.findHotelById(bookingData.hotel_id);
      const room = await bookingRepository.findRoomById(bookingData.room_id);

      return {
        ...bookingData,
        hotel: formatHotelForLegacyClients(hotel),
        room: formatRoom(room),
      };
    })
  );
}

module.exports = { getUserBookings };
