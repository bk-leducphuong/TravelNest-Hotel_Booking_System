const bookingRepository = require('../../infrastructure/booking-admin.repository');

/**
 * Paginated booking list for a hotel.
 */
async function listBookings(filters = {}) {
  const result = await bookingRepository.findForHotel(filters);

  return {
    bookings: result.rows,
    page: Math.max(parseInt(filters.page, 10) || 1, 1),
    limit: Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100),
    total: result.count,
  };
}

module.exports = { listBookings };
