const bookingRepository = require('../../infrastructure/booking.repository');

const { formatHotelForLegacyClients, formatRoom } = require('./formatters');

/**
 * Get a page of bookings for a user, refreshing statuses from the current date
 * first and enriching each row with its hotel and room.
 *
 * @param {number} userId
 * @param {{
 *   includeCancelled?: boolean,
 *   reviewed?: boolean,
 *   bookedAfter?: Date|string,
 *   page?: number,
 *   limit?: number,
 * }} options
 *   `reviewed` optionally filters by review state (true = only reviewed,
 *   false = only unreviewed). `bookedAfter` is a rolling-window filter on the
 *   booking's `created_at`. When `limit` is provided the result is paginated.
 * @returns {Promise<{ bookings: Array<object>, page: number, limit: number, total: number }>}
 */
async function getUserBookings(userId, options = {}) {
  const { includeCancelled = false, reviewed, bookedAfter, page, limit } = options;

  const parsedLimit = Number(limit);
  const paginated = Number.isFinite(parsedLimit) && parsedLimit > 0;
  const safeLimit = paginated ? Math.min(Math.floor(parsedLimit), 100) : undefined;
  const parsedPage = Number(page);
  const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const filters = {
    excludeCancelled: !includeCancelled,
    reviewed,
    bookedAfter,
  };

  const queryOptions = { ...filters };
  if (paginated) {
    queryOptions.limit = safeLimit;
    queryOptions.offset = (safePage - 1) * safeLimit;
  }

  // Update booking statuses based on current date
  await bookingRepository.updateStatusByDates(userId);

  // Get the page of bookings and the total for that same filter set
  const [bookings, total] = await Promise.all([
    bookingRepository.findByBuyerId(userId, queryOptions),
    bookingRepository.countByBuyerId(userId, filters),
  ]);

  // Enrich with hotel and room information
  const enriched = await Promise.all(
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

  return {
    bookings: enriched,
    page: safePage,
    limit: safeLimit ?? total,
    total,
  };
}

module.exports = { getUserBookings };
