const express = require('express');
const {
  createPaymentIntent,
  getUserPayments,
  getPaymentByBookingId,
  getPaymentByTransactionId,
} = require('@controllers/v1/payment.controller.js');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const paymentSchema = require('@validators/v1/payment.schema');
const router = express.Router();

// root route: /api/v1/payments (see routes/v1/index.js)
// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: List payments for the current user
 *     description: Returns paginated payment transactions for the authenticated user, including related payment details and hotel summary.
 *     tags:
 *       - Payments
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Page size
 *     responses:
 *       200:
 *         description: Paginated list of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Transaction row with nested payments and hotel (shape from Sequelize)
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', validate(paymentSchema.getUserPayments), getUserPayments);

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Create a payment intent from the active hold
 *     description: |
 *       Uses the authenticated user's current active room hold to create a provider payment intent
 *       (e.g. Stripe). Completes the hold flow and returns client secrets and booking code for the client.
 *       Requires an active, non-expired hold with rooms; call Hold endpoints first.
 *     tags:
 *       - Payments
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 minLength: 1
 *                 description: Payment method ID from the payment provider (e.g. Stripe PaymentMethod id)
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
 *                 pattern: '^[A-Z]{3}$'
 *                 example: USD
 *                 description: Optional ISO 4217 code; defaults from hold/provider when omitted
 *     responses:
 *       201:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientSecret:
 *                       type: string
 *                       description: Client secret for confirming payment on the client
 *                     paymentIntentId:
 *                       type: string
 *                       description: Provider payment intent identifier
 *                     status:
 *                       type: string
 *                       description: Payment intent status from the provider
 *                     bookingCode:
 *                       type: string
 *                       description: Booking code associated with this checkout
 *       400:
 *         description: Missing hold, expired hold, validation error, or provider error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 */
router.post('/', validate(paymentSchema.createPaymentIntent), createPaymentIntent);

/**
 * @swagger
 * /payments/bookings/{bookingId}:
 *   get:
 *     summary: Get payment by booking ID
 *     description: Returns the transaction/payment details for a booking. Only the booking owner may access.
 *     tags:
 *       - Payments
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Numeric booking primary key
 *     responses:
 *       200:
 *         description: Payment details for the booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Transaction with nested payment and hotel (shape from Sequelize)
 *       403:
 *         description: Forbidden — not the owner of this payment/booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment not found for this booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/bookings/:bookingId',
  validate(paymentSchema.getPaymentByBookingId),
  getPaymentByBookingId
);

/**
 * @swagger
 * /payments/transactions/{transactionId}:
 *   get:
 *     summary: Get payment by transaction ID
 *     description: Returns payment details for the given transaction. Only the buyer may access.
 *     tags:
 *       - Payments
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Transaction identifier
 *     responses:
 *       200:
 *         description: Payment record for the transaction
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Payment row (shape from Sequelize)
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/transactions/:transactionId',
  validate(paymentSchema.getPaymentByTransactionId),
  getPaymentByTransactionId
);

module.exports = router;
