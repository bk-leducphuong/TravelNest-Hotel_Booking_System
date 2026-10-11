const express = require('express');

const {
  authenticate,
  requirePermission,
  requireEntityInHotel,
} = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');
const { Transactions, Refunds } = require('@platform/database');

const schema = require('./schemas');
const controller = require('./admin.controller');

const router = express.Router();

// Payments/refunds are scoped to a hotel (platform staff may omit it for global views).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

// `:transactionId` / `:refundId` routes have no hotelId in the path, so assert
// the entity belongs to the caller's hotel context (closes the cross-hotel IDOR).
const transactionInHotel = requireEntityInHotel(async (req) => {
  const txn = await Transactions.findOne({
    where: { id: req.params.transactionId },
    attributes: ['hotel_id'],
  });
  return txn?.hotel_id;
});

const refundInHotel = requireEntityInHotel(async (req) => {
  const refund = await Refunds.findOne({
    where: { id: req.params.refundId },
    attributes: ['hotel_id'],
  });
  return refund?.hotel_id;
});

/**
 * Admin payment/refund routes (mounted at /api/v1/admin/payments).
 * Every route requires a bearer token and an explicit permission.
 */
router.use(authenticate);

// Transactions
router.get(
  '/transactions',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.listTransactions),
  controller.listTransactionsHandler
);

router.get(
  '/transactions/:transactionId',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.getTransaction),
  transactionInHotel,
  controller.getTransactionHandler
);

router.get(
  '/hotels/:hotelId/summary',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.getHotelPaymentSummary),
  controller.getHotelSummaryHandler
);

// Refunds
router.post(
  '/transactions/:transactionId/refunds',
  requireHotelPermission(PERMISSIONS.PAYMENT_REFUND),
  validate(schema.initiateRefund),
  transactionInHotel,
  controller.initiateRefundHandler
);

router.get(
  '/refunds',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.listRefunds),
  controller.listRefundsHandler
);

router.get(
  '/refunds/:refundId',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.getRefund),
  refundInHotel,
  controller.getRefundHandler
);

router.post(
  '/refunds/:refundId/retry',
  requireHotelPermission(PERMISSIONS.PAYMENT_REFUND),
  validate(schema.retryRefund),
  refundInHotel,
  controller.retryRefundHandler
);

module.exports = router;
