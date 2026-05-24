const bookingService = require('@services/booking.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

function getSessionUserId(req) {
  return req.session?.user?.id || req.session?.user?.user_id || req.user?.id || req.user?.user_id;
}

/**
 * Booking Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/bookings
 * Get all bookings for authenticated user
 */
const getUserBookings = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);
  const { includeCancelled } = req.query;

  const bookings = await bookingService.getUserBookings(userId, {
    includeCancelled: includeCancelled === 'true',
  });

  res.status(200).json({
    data: bookings,
  });
});

/**
 * POST /api/bookings
 * Create a pending-payment booking from an active hold.
 */
const createBooking = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);
  const idempotencyKey = req.headers['idempotency-key'];

  const booking = await bookingService.createBookingFromHold(userId, req.body, idempotencyKey);

  res.status(201).json({
    data: booking,
  });
});

/**
 * POST /api/bookings/:bookingId/payment-intent
 * Create or reuse a Stripe PaymentIntent for a pending-payment booking.
 */
const createBookingPaymentIntent = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);
  const { bookingId } = req.params;

  const result = await bookingService.createPaymentIntentForBooking(bookingId, userId, req.body);

  res.status(201).json({
    data: result,
  });
});

/**
 * GET /api/bookings/:bookingId
 * Get a specific booking by ID
 */
const getBookingById = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);
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
  const userId = getSessionUserId(req);
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
  const userId = getSessionUserId(req);
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
  createBooking,
  createBookingPaymentIntent,
  getBookingById,
  getBookingByCode,
  cancelBooking,
};
