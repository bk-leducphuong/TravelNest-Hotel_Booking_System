const paymentService = require('@services/payment.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Payment Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

/**
 * POST /api/payments
 * Create a payment intent for booking
 */
const createPaymentIntent = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { paymentMethodId, currency } = req.body;

  const result = await paymentService.createPaymentIntent(userId, {
    paymentMethodId,
    currency,
  });

  res.status(201).json({
    data: result,
  });
});

/**
 * GET /api/payments
 * Get all payments for authenticated user
 */
const getUserPayments = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { page, limit } = req.query;

  const result = await paymentService.getUserPayments(userId, {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
  });

  res.status(200).json({
    data: result.payments,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  });
});

/**
 * GET /api/payments/bookings/:bookingId
 * Get payment information by booking ID
 */
const getPaymentByBookingId = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { bookingId } = req.params;

  const payment = await paymentService.getPaymentByBookingId(bookingId, userId);

  res.status(200).json({
    data: payment,
  });
});

/**
 * GET /api/payments/transactions/:transactionId
 * Get payment information by transaction ID
 */
const getPaymentByTransactionId = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { transactionId } = req.params;

  const payment = await paymentService.getPaymentByTransactionId(
    parseInt(transactionId, 10),
    userId
  );

  res.status(200).json({
    data: payment,
  });
});

module.exports = {
  createPaymentIntent,
  getUserPayments,
  getPaymentByBookingId,
  getPaymentByTransactionId,
};
