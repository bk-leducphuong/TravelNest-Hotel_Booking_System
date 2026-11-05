const asyncHandler = require('@utils/asyncHandler');
const ApiError = require('@utils/ApiError');

const { listTransactions } = require('../application/admin/listTransactions');
const { getTransaction } = require('../application/admin/getTransaction');
const { getHotelPaymentSummary } = require('../application/admin/getHotelPaymentSummary');
const { initiateRefund } = require('../application/admin/initiateRefund');
const { listRefunds } = require('../application/admin/listRefunds');
const { getRefund } = require('../application/admin/getRefund');
const { retryRefund } = require('../application/admin/retryRefund');

const listTransactionsHandler = asyncHandler(async (req, res) => {
  const result = await listTransactions({
    ...req.query,
    hotelId: req.hotelContext?.hotelId || req.query.hotelId,
  });

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
  if (!req.get('Idempotency-Key') || req.get('Idempotency-Key').length > 200)
    throw new ApiError(
      400,
      'INVALID_IDEMPOTENCY_KEY',
      'A non-empty idempotency key of at most 200 characters is required'
    );
  const result = await initiateRefund(req.params.transactionId, req.body, {
    actorUserId: req.user.id,
    requestId: req.id,
    idempotencyKey: req.get('Idempotency-Key')
      ? `admin-${req.user.id}-${req.get('Idempotency-Key')}`
      : undefined,
  });

  res.status(201).json({ data: result });
});

const listRefundsHandler = asyncHandler(async (req, res) => {
  const result = await listRefunds({
    ...req.query,
    hotelId: req.hotelContext?.hotelId || req.query.hotelId,
  });

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

const resolveRefundReviewHandler = asyncHandler(async (req, res) => {
  const refund = await getRefund(req.params.refundId);
  const { queueRefund } = require('../application/refund-obligations');
  const result = await queueRefund(
    refund.transaction_id,
    { amount: req.body.amount, reason: 'other' },
    {
      reviewId: refund.id,
      actorUserId: req.user.id,
      reviewReason: req.body.reason,
    }
  );
  res.status(200).json({ data: result });
});

module.exports = {
  resolveRefundReviewHandler,
  listTransactionsHandler,
  getTransactionHandler,
  getHotelSummaryHandler,
  initiateRefundHandler,
  listRefundsHandler,
  getRefundHandler,
  retryRefundHandler,
};
