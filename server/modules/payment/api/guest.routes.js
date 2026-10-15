const express = require('express');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const paymentSchema = require('./guest.schema');
const {
  createPaymentIntent,
  getUserPayments,
  getPaymentByBookingId,
  getPaymentByTransactionId,
  createSetupIntent,
  savePaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  removePaymentMethod,
} = require('./payment.controller');
const router = express.Router();

// root route: /api/payments
// All routes require authentication
router.use(authenticate);

/**
 * GET /api/payments
 * Get all payments for authenticated user (with pagination)
 */
router.get('/', validate(paymentSchema.getUserPayments), getUserPayments);

/**
 * POST /api/payments
 * Create a payment intent for booking
 */
router.post('/', validate(paymentSchema.createPaymentIntent), createPaymentIntent);

/**
 * GET /api/payments/bookings/:bookingId
 * Get payment information by booking ID
 */
router.get(
  '/bookings/:bookingId',
  validate(paymentSchema.getPaymentByBookingId),
  getPaymentByBookingId
);

/**
 * GET /api/payments/transactions/:transactionId
 * Get payment information by transaction ID
 */
router.get(
  '/transactions/:transactionId',
  validate(paymentSchema.getPaymentByTransactionId),
  getPaymentByTransactionId
);

/**
 * Saved payment methods (account settings).
 *
 * NOTE: `/methods/setup-intent` is declared before `/methods/:paymentMethodId`
 * so the literal path is not swallowed by the param route.
 */
router.post('/methods/setup-intent', validate(paymentSchema.createSetupIntent), createSetupIntent);
router.post('/methods', validate(paymentSchema.savePaymentMethod), savePaymentMethod);
router.get('/methods', validate(paymentSchema.listPaymentMethods), listPaymentMethods);
router.post(
  '/methods/:paymentMethodId/default',
  validate(paymentSchema.paymentMethodIdParam),
  setDefaultPaymentMethod
);
router.delete(
  '/methods/:paymentMethodId',
  validate(paymentSchema.paymentMethodIdParam),
  removePaymentMethod
);

module.exports = router;
