const bookingRepository = require('../../infrastructure/booking-admin.repository');

/**
 * Bookings created per day for a hotel, over the last `days` days. Missing days
 * are filled with zero so the chart axis is continuous.
 */
async function getBookingTrend(hotelId, { days = 14 } = {}) {
  const safeDays = Math.min(Math.max(parseInt(days, 10) || 14, 1), 90);

  const rows = await bookingRepository.getDailyCounts(hotelId, { days: safeDays });
  const countsByDate = new Map(rows.map((row) => [String(row.date), parseInt(row.count, 10) || 0]));

  const points = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - (safeDays - 1));

  for (let i = 0; i < safeDays; i += 1) {
    const date = cursor.toISOString().slice(0, 10);
    points.push({ date, count: countsByDate.get(date) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { hotelId, days: safeDays, points };
}

module.exports = { getBookingTrend };
