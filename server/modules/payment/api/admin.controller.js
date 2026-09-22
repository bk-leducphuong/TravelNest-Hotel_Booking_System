const asyncHandler = require('@utils/asyncHandler');

const { listTransactions } = require('../application/admin/listTransactions');
const { getTransaction } = require('../application/admin/getTransaction');
const { getHotelPaymentSummary } = require('../application/admin/getHotelPaymentSummary');
const { initiateRefund } = require('../application/admin/initiateRefund');
const { listRefunds } = require('../application/admin/listRefunds');
const { getRefund } = require('../application/admin/getRefund');
const { retryRefund } = require('../application/admin/retryRefund');

const listTransactionsHandler = asyncHandler(async (req, res) => {
  const result = await listTransactions(req.query);

  res.status(200).json({
    data: result.transactions,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

const getTransactionHandler = asyncHandler(async (req, res) => {
  const transaction = await getTransaction(req.params.transactionId);

  res.status(200).json({ data: transaction });
});

const getHotelSummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getHotelPaymentSummary(req.params.hotelId);

  res.status(200).json({ data: summary });
});

const initiateRefundHandler = asyncHandler(async (req, res) => {
  const result = await initiateRefund(req.params.transactionId, req.body, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(201).json({ data: result });
});

const listRefundsHandler = asyncHandler(async (req, res) => {
  const result = await listRefunds(req.query);

  res.status(200).json({
    data: result.refunds,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

const getRefundHandler = asyncHandler(async (req, res) => {
  const refund = await getRefund(req.params.refundId);

  res.status(200).json({ data: refund });
});

const retryRefundHandler = asyncHandler(async (req, res) => {
  const result = await retryRefund(req.params.refundId, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: result });
});

module.exports = {
  listTransactionsHandler,
  getTransactionHandler,
  getHotelSummaryHandler,
  initiateRefundHandler,
  listRefundsHandler,
  getRefundHandler,
  retryRefundHandler,
};
