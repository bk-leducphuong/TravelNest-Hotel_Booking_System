const bookingService = require('@services/booking.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Booking Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/bookings
 * Get all bookings for authenticated user
 */
const getUserBookings = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { includeCancelled } = req.query;

  const bookings = await bookingService.getUserBookings(userId, {
    includeCancelled: includeCancelled === 'true',
  });

  res.status(200).json({
    data: bookings,
  });
});

/**
 * GET /api/bookings/:bookingId
 * Get a specific booking by ID
 */
const getBookingById = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { bookingId } = req.params;

  const booking = await bookingService.getBookingById(bookingId, userId);

  res.status(200).json({
    data: booking,
  });
});

/**
 * GET /api/bookings/code/:bookingCode
 * Get booking by booking code
 */
const getBookingByCode = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { bookingCode } = req.params;

  const booking = await bookingService.getBookingByCode(bookingCode, userId);

  res.status(200).json({
    data: booking,
  });
});

/**
 * DELETE /api/bookings/:bookingId
 * Cancel a booking
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { bookingId } = req.params;
  const { processRefund } = req.query;

  const result = await bookingService.cancelBooking(bookingId, userId, {
    processRefund: processRefund === 'true',
  });

  res.status(200).json({
    data: result,
  });
});

module.exports = {
  getUserBookings,
  getBookingById,
  getBookingByCode,
  cancelBooking,
};
