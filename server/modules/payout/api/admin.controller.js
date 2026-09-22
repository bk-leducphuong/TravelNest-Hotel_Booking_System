const asyncHandler = require('@utils/asyncHandler');

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

const listPayoutsHandler = asyncHandler(async (req, res) => {
  const result = await listPayouts(req.query);

  res.status(200).json({
    data: result.payouts,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

const getPayoutHandler = asyncHandler(async (req, res) => {
  const payout = await getPayout(req.params.payoutId);

  res.status(200).json({ data: payout });
});

const getHotelPayoutSummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getHotelPayoutSummary(req.params.hotelId);

  res.status(200).json({ data: summary });
});

const generateEligiblePayoutsHandler = asyncHandler(async (req, res) => {
  const result = await generateEligiblePayouts({
    cutoffDate: req.body.cutoffDate,
    ownerId: req.body.ownerId,
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(201).json({ data: result });
});

const processPayoutHandler = asyncHandler(async (req, res) => {
  const payout = await processPayout(req.params.payoutId, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: payout });
});

const setPayoutStatusHandler = asyncHandler(async (req, res) => {
  const payout = await setPayoutStatus(req.params.payoutId, {
    status: req.body.status,
    failureCode: req.body.failureCode,
    failureMessage: req.body.failureMessage,
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: payout });
});

const listConnectedAccountsHandler = asyncHandler(async (req, res) => {
  const accounts = await listConnectedAccounts({
    hotelId: req.query.hotelId,
    ownerId: req.query.ownerId,
  });

  res.status(200).json({ data: accounts });
});

const checkConnectedAccountHandler = asyncHandler(async (req, res) => {
  const result = await checkConnectedAccount({
    hotelId: req.query.hotelId,
    ownerId: req.query.ownerId,
  });

  res.status(200).json({ data: result });
});

const createConnectAccountHandler = asyncHandler(async (req, res) => {
  const account = await createConnectAccount(req.body, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(201).json({ data: account });
});

const createAccountLinkHandler = asyncHandler(async (req, res) => {
  const link = await createAccountLink(
    {
      accountId: req.params.accountId,
      refreshUrl: req.body.refreshUrl,
      returnUrl: req.body.returnUrl,
    },
    { actorUserId: req.user.id, requestId: req.id }
  );

  res.status(200).json({ data: link });
});

const syncConnectedAccountHandler = asyncHandler(async (req, res) => {
  const account = await syncConnectedAccount(req.params.accountId, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: account });
});

module.exports = {
  listPayoutsHandler,
  getPayoutHandler,
  getHotelPayoutSummaryHandler,
  generateEligiblePayoutsHandler,
  processPayoutHandler,
  setPayoutStatusHandler,
  listConnectedAccountsHandler,
  checkConnectedAccountHandler,
  createConnectAccountHandler,
  createAccountLinkHandler,
  syncConnectedAccountHandler,
};
