const sequelize = require('@config/database.config');
const ApiError = require('@utils/ApiError');
const refunds = require('../../infrastructure/refund.repository');
const transactions = require('../../infrastructure/transaction-admin.repository');
const { presentRefund } = require('../refund-obligations');

async function retryRefund(refundId) {
  const initial = await refunds.findById(refundId);
  if (!initial) throw new ApiError(404, 'REFUND_NOT_FOUND', 'Refund not found');
  return sequelize.transaction(async (transaction) => {
    const options = { transaction, lock: transaction.LOCK.UPDATE };
    await transactions.findById(initial.transaction_id, options);
    const refund = await refunds.findById(refundId, options);
    // Provider failures require a new, explicitly reviewed refund operation. Unknown outcomes must retain the existing key.
    if (
      !refund.idempotency_key ||
      refund.eligibility !== 'eligible' ||
      !['unknown', 'needs_attention'].includes(refund.workflow_state) ||
      refund.status === 'failed' ||
      refund.status === 'cancelled' ||
      refund.status === 'succeeded' ||
      (refund.lease_until && new Date(refund.lease_until) > new Date())
    ) {
      throw new ApiError(
        409,
        'REFUND_NOT_RETRYABLE',
        'Reconcile this refund before creating or retrying an operation'
      );
    }
    await refunds.update(
      refundId,
      {
        status: 'processing',
        workflow_state: 'unknown',
        next_retry_at: new Date(),
        attempt_count: 0,
      },
      { transaction }
    );
    return presentRefund({ ...refund.toJSON(), workflow_state: 'unknown' });
  });
}

module.exports = { retryRefund };
