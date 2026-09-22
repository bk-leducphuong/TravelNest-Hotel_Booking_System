const ApiError = require('@utils/ApiError');

const refundRepository = require('../../infrastructure/refund.repository');
const transactionRepository = require('../../infrastructure/transaction.repository');
const {
  assertRefundableTransaction,
  remainingRefundable,
  round2,
} = require('../../domain/refund-rules');
const { processRefundAttempt } = require('./processRefundAttempt');

/**
 * Retry a previously failed refund. Creates a fresh provider refund attempt on
 * the same refund record so history stays in one place.
 */
async function retryRefund(refundId, { actorUserId, requestId } = {}) {
  const refund = await refundRepository.findByIdWithRelations(refundId);

  if (!refund) {
    throw new ApiError(404, 'REFUND_NOT_FOUND', 'Refund not found');
  }

  if (refund.status !== 'failed') {
    throw new ApiError(
      409,
      'REFUND_NOT_RETRYABLE',
      `Only failed refunds can be retried (current status: ${refund.status})`
    );
  }

  const transaction = await transactionRepository.findByIdWithRelations(refund.transaction_id);
  assertRefundableTransaction(transaction);

  const activeSum = await refundRepository.sumActiveForTransaction(transaction.id);
  const remaining = remainingRefundable(transaction.amount, activeSum);

  if (round2(refund.amount) > remaining + 0.001) {
    throw new ApiError(
      409,
      'REFUND_EXCEEDS_REMAINING',
      `Refund amount ${refund.amount} exceeds the remaining refundable amount ${remaining}`
    );
  }

  await refundRepository.update(refund.id, {
    status: 'pending',
    failureCode: null,
    failureMessage: null,
  });

  const refreshed = await refundRepository.findById(refund.id);

  return await processRefundAttempt({
    refund: refreshed,
    transaction,
    reason: refund.reason,
    actorUserId,
    requestId,
  });
}

module.exports = { retryRefund };
