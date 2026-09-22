const { Op } = require('sequelize');

const bookingRepository = require('../../infrastructure/booking-admin.repository');

/**
 * Booking status breakdown plus today's arrivals/departures for a hotel.
 */
async function getBookingStats(hotelId) {
  const rows = await bookingRepository.getStatusCounts(hotelId);

  const byStatus = {};
  let total = 0;

  for (const row of rows) {
    const count = parseInt(row.count, 10) || 0;
    byStatus[row.status] = count;
    total += count;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [arrivalsToday, departuresToday] = await Promise.all([
    bookingRepository.countWhere(hotelId, {
      status: { [Op.in]: ['confirmed', 'checked_in'] },
      check_in_date: today,
    }),
    bookingRepository.countWhere(hotelId, {
      status: { [Op.in]: ['checked_in', 'completed'] },
      check_out_date: today,
    }),
  ]);

  return {
    hotelId,
    total,
    byStatus,
    arrivalsToday,
    departuresToday,
  };
}

module.exports = { getBookingStats };
