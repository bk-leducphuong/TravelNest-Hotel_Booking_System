const express = require('express');

const {
  authenticate,
  requirePermission,
  requireEntityInHotel,
  isPlatformStaff,
} = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');
const ApiError = require('@utils/ApiError');
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

/**
 * Connected accounts can be hotel-scoped or owner-scoped (`hotel_id = null`).
 * A hotel-scoped caller may manage either an account of their hotel or their
 * own owner-level account. Platform staff bypass the check.
 */
const connectedAccountAccess = async (req, res, next) => {
  try {
    const account = await ConnectedPaymentAccounts.findOne({
      where: { id: req.params.accountId },
      attributes: ['id', 'hotel_id', 'user_id'],
    });

    if (!account) {
      // Let the use-case return its normal 404.
      return next();
    }

    if (isPlatformStaff(req)) {
      return next();
    }

    const hotelContextId = req.hotelContext?.hotelId;
    const accountInHotel = account.hotel_id && String(account.hotel_id) === String(hotelContextId);
    const ownOwnerLevelAccount =
      !account.hotel_id && String(account.user_id) === String(req.user.id);

    if (accountInHotel || ownOwnerLevelAccount) {
      return next();
    }

    return next(
      new ApiError(403, 'RESOURCE_ACCESS_DENIED', 'You do not have access to this resource.')
    );
  } catch (error) {
    return next(error);
  }
};

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

router.get(
  '/settings',
  requireHotelPermission(PERMISSIONS.PAYMENT_READ),
  controller.getPayoutSettingsHandler
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
  connectedAccountAccess,
  controller.createAccountLinkHandler
);

router.post(
  '/connected-accounts/:accountId/sync',
  requireHotelPermission(PERMISSIONS.PAYMENT_PROCESS),
  validate(schema.syncConnectedAccount),
  connectedAccountAccess,
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
