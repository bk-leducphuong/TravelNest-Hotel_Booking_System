const { fn, col } = require('sequelize');

const { Refunds } = require('@models/index.js');

/**
 * Refund records attached to bookings.
 */

async function createRefund(refundData, options = {}) {
  return await Refunds.create(
    {
      booking_id: refundData.bookingId,
      transaction_id: refundData.transactionId,
      buyer_id: refundData.buyerId,
      hotel_id: refundData.hotelId,
      provider: refundData.provider || 'stripe',
      provider_refund_id: refundData.providerRefundId,
      amount: refundData.amount,
      currency: refundData.currency || 'USD',
      status: refundData.status || 'pending',
      reason: refundData.reason || 'customer_request',
      eligibility: refundData.eligibility || 'manual_review',
      free_cancellation_deadline: refundData.freeCancellationDeadline,
      requested_at: refundData.requestedAt,
      processed_at: refundData.processedAt,
      failure_code: refundData.failureCode,
      failure_message: refundData.failureMessage,
      metadata: refundData.metadata,
    },
    options
  );
}

async function updateRefund(refundId, updateData, options = {}) {
  const mappedData = {};
  if (updateData.providerRefundId !== undefined)
    mappedData.provider_refund_id = updateData.providerRefundId;
  if (updateData.status !== undefined) mappedData.status = updateData.status;
  if (updateData.processedAt !== undefined) mappedData.processed_at = updateData.processedAt;
  if (updateData.failureCode !== undefined) mappedData.failure_code = updateData.failureCode;
  if (updateData.failureMessage !== undefined)
    mappedData.failure_message = updateData.failureMessage;
  if (updateData.metadata !== undefined) mappedData.metadata = updateData.metadata;

  return await Refunds.update(mappedData, {
    where: { id: refundId },
    ...options,
  });
}

async function findRefundByProviderRefundId(providerRefundId, options = {}) {
  return await Refunds.findOne({
    where: { provider_refund_id: providerRefundId },
    ...options,
  });
}

async function sumSucceededRefunds(transactionId, options = {}) {
  const result = await Refunds.findOne({
    attributes: [[fn('SUM', col('amount')), 'total']],
    where: { transaction_id: transactionId, status: 'succeeded' },
    raw: true,
    ...options,
  });

  return result?.total ? parseFloat(result.total) : 0;
}

module.exports = {
  createRefund,
  updateRefund,
  findRefundByProviderRefundId,
  sumSucceededRefunds,
};
