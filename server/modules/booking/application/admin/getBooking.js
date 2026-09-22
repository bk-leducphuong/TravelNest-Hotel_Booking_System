const ApiError = require('@utils/ApiError');

const bookingRepository = require('../../infrastructure/booking-admin.repository');

async function getBooking(bookingId) {
  const booking = await bookingRepository.findByIdWithRelations(bookingId);

  if (!booking) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  return booking;
}

module.exports = { getBooking };
