const express = require('express');
const {
  getUserBookings,
  createBooking,
  createBookingPaymentIntent,
  getBookingById,
  getBookingByCode,
  cancelBooking,
} = require('@controllers/v1/booking.controller.js');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const bookingSchema = require('@validators/v1/booking.schema');
const router = express.Router();

// root route: /api/bookings
router.use(authenticate);

/**
 * POST /api/bookings
 * Create a pending-payment booking from an active hold.
 */
router.post('/', validate(bookingSchema.createBooking), createBooking);

/**
 * GET /api/bookings
 * Get all bookings for authenticated user
 */
router.get('/', validate(bookingSchema.getUserBookings), getUserBookings);

/**
 * GET /api/bookings/code/:bookingCode
 * Get booking by booking code
 */
router.get('/code/:bookingCode', validate(bookingSchema.getBookingByCode), getBookingByCode);

/**
 * POST /api/bookings/:bookingId/payment-intent
 * Create a Stripe PaymentIntent for a pending-payment booking.
 */
router.post(
  '/:bookingId/payment-intent',
  validate(bookingSchema.createBookingPaymentIntent),
  createBookingPaymentIntent
);

/**
 * GET /api/bookings/:bookingId
 * Get a specific booking by ID
 */
router.get('/:bookingId', validate(bookingSchema.getBookingById), getBookingById);

/**
 * DELETE /api/bookings/:bookingId
 * Cancel a booking
 */
router.delete('/:bookingId', validate(bookingSchema.cancelBooking), cancelBooking);

module.exports = router;
