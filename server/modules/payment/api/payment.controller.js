const paymentUseCases = {
  createPaymentIntent: require('../application/guest/createPaymentIntent').createPaymentIntent,
  getPaymentByBookingId: require('../application/guest/getPaymentByBookingId')
    .getPaymentByBookingId,
  getPaymentByTransactionId: require('../application/guest/getPaymentByTransactionId')
    .getPaymentByTransactionId,
  getUserPayments: require('../application/guest/getUserPayments').getUserPayments,
  createSetupIntent: require('../application/guest/createSetupIntent').createSetupIntent,
  savePaymentMethod: require('../application/guest/savePaymentMethod').savePaymentMethod,
  listPaymentMethods: require('../application/guest/listPaymentMethods').listPaymentMethods,
  setDefaultPaymentMethod: require('../application/guest/setDefaultPaymentMethod')
    .setDefaultPaymentMethod,
  removePaymentMethod: require('../application/guest/removePaymentMethod').removePaymentMethod,
};
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

function getSessionUserId(req) {
  return req.session?.user?.id || req.session?.user?.user_id || req.user?.id || req.user?.user_id;
}

/**
 * Payment Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

/**
 * POST /api/payments
 * Create a payment intent for booking
 */
const createPaymentIntent = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);
  const { paymentMethodId, currency } = req.body;

  const result = await paymentUseCases.createPaymentIntent(userId, {
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
  const userId = getSessionUserId(req);
  const { page, limit } = req.query;

  const result = await paymentUseCases.getUserPayments(userId, {
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
  const userId = getSessionUserId(req);
  const { bookingId } = req.params;

  const payment = await paymentUseCases.getPaymentByBookingId(bookingId, userId);

  res.status(200).json({
    data: payment,
  });
});

/**
 * GET /api/payments/transactions/:transactionId
 * Get payment information by transaction ID
 */
const getPaymentByTransactionId = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);
  const { transactionId } = req.params;

  const payment = await paymentUseCases.getPaymentByTransactionId(transactionId, userId);

  res.status(200).json({
    data: payment,
  });
});

/**
 * POST /api/payments/methods/setup-intent
 * Create a Stripe SetupIntent so the client can attach a card.
 */
const createSetupIntent = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);

  const result = await paymentUseCases.createSetupIntent(userId);

  res.status(201).json({ data: result });
});

/**
 * POST /api/payments/methods
 * Persist a card the client just attached via a confirmed SetupIntent.
 */
const savePaymentMethod = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);
  const { setupIntentId } = req.body;

  const result = await paymentUseCases.savePaymentMethod(userId, { setupIntentId });

  res.status(201).json({ data: result });
});

/**
 * GET /api/payments/methods
 * List the authenticated user's saved cards.
 */
const listPaymentMethods = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);

  const result = await paymentUseCases.listPaymentMethods(userId);

  res.status(200).json({ data: result });
});

/**
 * POST /api/payments/methods/:paymentMethodId/default
 * Set a saved card as the default.
 */
const setDefaultPaymentMethod = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);
  const { paymentMethodId } = req.params;

  const result = await paymentUseCases.setDefaultPaymentMethod(userId, paymentMethodId);

  res.status(200).json({ data: result });
});

/**
 * DELETE /api/payments/methods/:paymentMethodId
 * Remove a saved card.
 */
const removePaymentMethod = asyncHandler(async (req, res) => {
  const userId = getSessionUserId(req);
  const { paymentMethodId } = req.params;

  const result = await paymentUseCases.removePaymentMethod(userId, paymentMethodId);

  res.status(200).json({ data: result });
});

module.exports = {
  createPaymentIntent,
  getUserPayments,
  getPaymentByBookingId,
  getPaymentByTransactionId,
  createSetupIntent,
  savePaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  removePaymentMethod,
};
