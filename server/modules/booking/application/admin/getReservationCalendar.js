const ApiError = require('@utils/ApiError');

const bookingRepository = require('../../infrastructure/booking-admin.repository');

/**
 * Bookings overlapping a date range, for the reservations calendar grid.
 */
async function getReservationCalendar(hotelId, { startDate, endDate } = {}) {
  if (!startDate || !endDate) {
    throw new ApiError(400, 'DATE_RANGE_REQUIRED', 'startDate and endDate are required');
  }

  const bookings = await bookingRepository.findCalendar({ hotelId, startDate, endDate });
  return { hotelId, startDate, endDate, bookings };
}

module.exports = { getReservationCalendar };
