const ApiError = require('@utils/ApiError');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');

const refundRepository = require('../../infrastructure/refund.repository');
const transactionRepository = require('../../infrastructure/transaction.repository');
const {
  assertRefundableTransaction,
  normalizeReason,
  remainingRefundable,
  resolveRefundAmount,
} = require('../../domain/refund-rules');
const { processRefundAttempt } = require('./processRefundAttempt');

/**
 * Admin-initiated refund for a transaction (full or partial).
 *
 * This is a financial operation only: it does not cancel the booking or release
 * inventory. Cancellation is a separate booking action so compensation refunds
 * don't silently cancel a stay.
 */
async function initiateRefund(transactionId, payload = {}, { actorUserId, requestId } = {}) {
  const transaction = await transactionRepository.findByIdWithRelations(transactionId);

  assertRefundableTransaction(transaction);

  const inProgress = await refundRepository.findActiveForTransaction(transactionId);
  if (inProgress) {
    throw new ApiError(
      409,
      'REFUND_IN_PROGRESS',
      'A refund for this transaction is already in progress'
    );
  }

  const activeSum = await refundRepository.sumActiveForTransaction(transactionId);
  const remaining = remainingRefundable(transaction.amount, activeSum);

  if (remaining <= 0) {
    throw new ApiError(
      409,
      'TRANSACTION_FULLY_REFUNDED',
      'This transaction has already been fully refunded'
    );
  }

  const amount = resolveRefundAmount(payload.amount, remaining);
  const reason = normalizeReason(payload.reason);

  const refund = await refundRepository.create({
    bookingId: transaction.booking_id,
    transactionId: transaction.id,
    buyerId: transaction.buyer_id,
    hotelId: transaction.hotel_id,
    provider: 'stripe',
    amount,
    currency: transaction.currency || 'USD',
    status: 'pending',
    reason,
    eligibility: 'eligible',
    metadata: { source: 'admin', initiated_by: actorUserId || null },
  });

  await eventBus.publish(DOMAIN_EVENTS.PAYMENT_REFUND_CREATED, {
    refundId: refund.id,
    transactionId: transaction.id,
    hotelId: transaction.hotel_id,
    buyerId: transaction.buyer_id,
    amount,
    currency: transaction.currency || 'USD',
  });

  return await processRefundAttempt({
    refund,
    transaction,
    reason,
    actorUserId,
    requestId,
  });
}

module.exports = { initiateRefund };
