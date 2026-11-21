const { isPlatformStaff } = require('@middlewares/auth.middleware');
const { listPayouts } = require('../application/admin/listPayouts');
const { getPayout } = require('../application/admin/getPayout');
const { getHotelPayoutSummary } = require('../application/admin/getHotelPayoutSummary');
const { generateEligiblePayouts } = require('../application/admin/generateEligiblePayouts');
const { processPayout } = require('../application/admin/processPayout');
const { setPayoutStatus } = require('../application/admin/setPayoutStatus');
const { listConnectedAccounts } = require('../application/admin/listConnectedAccounts');
const { checkConnectedAccount } = require('../application/admin/checkConnectedAccount');
const { createConnectAccount } = require('../application/admin/createConnectAccount');
const { createAccountLink } = require('../application/admin/createAccountLink');
const { syncConnectedAccount } = require('../application/admin/syncConnectedAccount');
const payoutSettings = require('../application/payout-settings');

/** Hotel context is authoritative for non-platform-staff; staff may go global. */
function callerScope(req) {
  return {
    actorUserId: req.user?.id,
    actorHotelId: req.hotelContext?.hotelId || null,
    isPlatformStaff: isPlatformStaff(req),
  };
}

const listPayoutsHandler = async (req, res) => {
  const scope = callerScope(req);
  const result = await listPayouts({
    ...req.query,
    hotelId: scope.actorHotelId || (scope.isPlatformStaff ? req.query.hotelId : undefined),
  });

  res.status(200).json({
    data: result.payouts,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
};

const getPayoutHandler = async (req, res) => {
  const payout = await getPayout(req.params.payoutId);

  res.status(200).json({ data: payout });
};

const getHotelPayoutSummaryHandler = async (req, res) => {
  const summary = await getHotelPayoutSummary(req.params.hotelId);

  res.status(200).json({ data: summary });
};

const getPayoutSettingsHandler = async (req, res) => {
  res.status(200).json({
    data: {
      autoGenerate: payoutSettings.isAutoGenerateEnabled(),
      autoProcess: payoutSettings.isAutoProcessEnabled(),
      holdDays: payoutSettings.getHoldDays(),
      generationIntervalMs: payoutSettings.getGenerationIntervalMs(),
      processingIntervalMs: payoutSettings.getProcessingIntervalMs(),
      staleMinutes: payoutSettings.getStaleMinutes(),
      minimumAmount: payoutSettings.getMinimumPayoutAmount(),
    },
  });
};

const generateEligiblePayoutsHandler = async (req, res) => {
  const scope = callerScope(req);
  const result = await generateEligiblePayouts({
    cutoffDate: req.body.cutoffDate,
    ownerId: scope.isPlatformStaff ? req.body.ownerId : undefined,
    hotelId: scope.actorHotelId || (scope.isPlatformStaff ? req.body.hotelId : undefined),
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(201).json({ data: result });
};

const processPayoutHandler = async (req, res) => {
  const payout = await processPayout(req.params.payoutId, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: payout });
};

const setPayoutStatusHandler = async (req, res) => {
  const payout = await setPayoutStatus(req.params.payoutId, {
    status: req.body.status,
    failureCode: req.body.failureCode,
    failureMessage: req.body.failureMessage,
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: payout });
};

const listConnectedAccountsHandler = async (req, res) => {
  const scope = callerScope(req);
  const accounts = await listConnectedAccounts({
    hotelId: req.query.hotelId,
    ownerId: req.query.ownerId,
    ...scope,
  });

  res.status(200).json({ data: accounts });
};

const checkConnectedAccountHandler = async (req, res) => {
  const scope = callerScope(req);
  const result = await checkConnectedAccount({
    hotelId: req.query.hotelId,
    ownerId: req.query.ownerId,
    ...scope,
  });

  res.status(200).json({ data: result });
};

const createConnectAccountHandler = async (req, res) => {
  const scope = callerScope(req);
  const account = await createConnectAccount(req.body, {
    ...scope,
    requestId: req.id,
  });

  res.status(201).json({ data: account });
};

const createAccountLinkHandler = async (req, res) => {
  const link = await createAccountLink(
    {
      accountId: req.params.accountId,
      refreshUrl: req.body.refreshUrl,
      returnUrl: req.body.returnUrl,
    },
    { actorUserId: req.user.id, requestId: req.id }
  );

  res.status(200).json({ data: link });
};

const syncConnectedAccountHandler = async (req, res) => {
  const account = await syncConnectedAccount(req.params.accountId, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: account });
};

module.exports = {
  listPayoutsHandler,
  getPayoutHandler,
  getHotelPayoutSummaryHandler,
  getPayoutSettingsHandler,
  generateEligiblePayoutsHandler,
  processPayoutHandler,
  setPayoutStatusHandler,
  listConnectedAccountsHandler,
  checkConnectedAccountHandler,
  createConnectAccountHandler,
  createAccountLinkHandler,
  syncConnectedAccountHandler,
};
