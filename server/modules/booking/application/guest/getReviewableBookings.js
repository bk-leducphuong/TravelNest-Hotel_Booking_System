const bookingRepository = require('../../infrastructure/booking.repository');

const { formatHotelForLegacyClients } = require('./formatters');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/**
 * Completed trips the authenticated user can still review, newest first.
 *
 * Paginated on purpose: the dashboard only renders one page of review prompts,
 * so there is no reason to ship a user's entire booking history. Each row is
 * enriched with its hotel (name, city and active images) via a single batched
 * lookup; rooms are omitted because the review prompt does not show them.
 *
 * @param {number} userId
 * @param {{ page?: number|string, limit?: number|string }} [options]
 * @returns {Promise<{ bookings: Array<object>, page: number, limit: number, total: number }>}
 */
async function getReviewableBookings(userId, { page, limit } = {}) {
  const safeLimit = Math.min(parsePositiveInt(limit, DEFAULT_LIMIT), MAX_LIMIT);
  const safePage = parsePositiveInt(page, 1);

  // Refresh confirmed/checked-in rows first so trips that just ended surface.
  await bookingRepository.updateStatusByDates(userId);

  const [bookings, total] = await Promise.all([
    bookingRepository.findReviewableByBuyerId(userId, {
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    }),
    bookingRepository.countReviewableByBuyerId(userId),
  ]);

  const hotels = await bookingRepository.findHotelsByIds(
    bookings.map((booking) => booking.hotel_id)
  );
  const hotelsById = new Map(hotels.map((hotel) => [hotel.id, hotel]));

  return {
    bookings: bookings.map((booking) => {
      const bookingData = booking.toJSON ? booking.toJSON() : booking;

      return {
        ...bookingData,
        hotel: formatHotelForLegacyClients(hotelsById.get(bookingData.hotel_id) || null),
      };
    }),
    page: safePage,
    limit: safeLimit,
    total,
  };
}

module.exports = { getReviewableBookings };
