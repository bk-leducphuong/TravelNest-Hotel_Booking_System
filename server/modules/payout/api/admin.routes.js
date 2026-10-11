const express = require('express');

const {
  authenticate,
  requirePermission,
  requireEntityInHotel,
} = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');
const { Payouts, ConnectedPaymentAccounts } = require('@platform/database');

const schema = require('./schemas');
const controller = require('./admin.controller');

const router = express.Router();

// Payouts are scoped to a hotel (platform staff may omit it for global views).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

// `:payoutId` / `:accountId` routes have no hotelId in the path, so assert the
// entity belongs to the caller's hotel context (closes the cross-hotel IDOR).
const payoutInHotel = requireEntityInHotel(async (req) => {
  const payout = await Payouts.findOne({
    where: { id: req.params.payoutId },
    attributes: ['hotel_id'],
  });
  return payout?.hotel_id;
});

const connectedAccountInHotel = requireEntityInHotel(async (req) => {
  const account = await ConnectedPaymentAccounts.findOne({
    where: { id: req.params.accountId },
    attributes: ['hotel_id'],
  });
  return account?.hotel_id;
});

/**
 * Admin payout routes (mounted at /api/v1/admin/payouts).
 * Every route requires a bearer token and an explicit permission.
 */
router.use(authenticate);

// Payout listing / detail
router.get(
  '/',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.listPayouts),
  controller.listPayoutsHandler
);

router.get(
  '/hotels/:hotelId/summary',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.getHotelPayoutSummary),
  controller.getHotelPayoutSummaryHandler
);

// Batch generation + execution
router.post(
  '/eligible',
  requireHotelPermission(PERMISSIONS.PAYMENT_PROCESS),
  validate(schema.generateEligiblePayouts),
  controller.generateEligiblePayoutsHandler
);

// Connected accounts (Stripe Connect onboarding)
router.get(
  '/connected-accounts',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.listConnectedAccounts),
  controller.listConnectedAccountsHandler
);

router.get(
  '/connected-accounts/check',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.checkConnectedAccount),
  controller.checkConnectedAccountHandler
);

router.post(
  '/connected-accounts',
  requireHotelPermission(PERMISSIONS.PAYMENT_PROCESS),
  validate(schema.createConnectAccount),
  controller.createConnectAccountHandler
);

router.post(
  '/connected-accounts/:accountId/link',
  requireHotelPermission(PERMISSIONS.PAYMENT_PROCESS),
  validate(schema.createAccountLink),
  connectedAccountInHotel,
  controller.createAccountLinkHandler
);

router.post(
  '/connected-accounts/:accountId/sync',
  requireHotelPermission(PERMISSIONS.PAYMENT_PROCESS),
  validate(schema.syncConnectedAccount),
  connectedAccountInHotel,
  controller.syncConnectedAccountHandler
);

// Payout detail + lifecycle (declared last: dynamic :payoutId)
router.get(
  '/:payoutId',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  validate(schema.getPayout),
  payoutInHotel,
  controller.getPayoutHandler
);

router.post(
  '/:payoutId/process',
  requireHotelPermission(PERMISSIONS.PAYMENT_PROCESS),
  validate(schema.processPayout),
  payoutInHotel,
  controller.processPayoutHandler
);

router.patch(
  '/:payoutId/status',
  requireHotelPermission(PERMISSIONS.PAYMENT_PROCESS),
  validate(schema.setPayoutStatus),
  payoutInHotel,
  controller.setPayoutStatusHandler
);

module.exports = router;
