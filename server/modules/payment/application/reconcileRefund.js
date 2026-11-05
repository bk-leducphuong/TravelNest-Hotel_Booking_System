const sequelize = require('@config/database.config');
const ApiError = require('@utils/ApiError');
const refunds = require('../infrastructure/refund.repository');
const transactions = require('../infrastructure/transaction-admin.repository');
const ledger = require('./ledger.service');
const outbox = require('../infrastructure/outbox.repository');
const { presentRefund } = require('./refund-obligations');

/** API results and webhooks share the same atomic, repairable local finalization. */
async function reconcileRefund(refundId, providerRefund) {
  const initial = await refunds.findById(refundId);
  if (!initial) throw new Error('Refund obligation not found');
  return sequelize.transaction(async (transaction) => {
    const options = { transaction, lock: transaction.LOCK.UPDATE };
    const payment = await transactions.findById(initial.transaction_id, options);
    const refund = await refunds.findById(refundId, options);
    const raw = providerRefund.raw;
    if (
      !raw ||
      raw.charge !== payment.stripe_charge_id ||
      Number(raw.amount) !== Math.round(Number(refund.amount) * 100) ||
      String(raw.currency).toUpperCase() !== refund.currency.toUpperCase()
    ) {
      throw new ApiError(
        409,
        'REFUND_PROVIDER_MISMATCH',
        'Provider refund does not match the recorded obligation'
      );
    }
    // Confirmed provider failure is terminal for this provider refund ID, even after bank submission succeeded.
    const providerFailed = ['failed', 'cancelled'].includes(providerRefund.status);
    const status = ['failed', 'cancelled'].includes(refund.status)
      ? refund.status
      : refund.status === 'succeeded' && !providerFailed
        ? 'succeeded'
        : providerRefund.status;
    if (!['processing', 'pending', 'succeeded', 'failed', 'cancelled'].includes(status))
      throw new Error(`Unsupported provider refund status: ${status}`);
    const succeeded = status === 'succeeded';
    const terminal = ['succeeded', 'failed', 'cancelled'].includes(status);
    await refunds.update(
      refund.id,
      {
        providerRefundId: providerRefund.id,
        status,
        workflow_state: succeeded ? 'succeeded' : terminal ? 'needs_attention' : 'provider_pending',
        processedAt: terminal ? new Date() : null,
        lease_until: null,
        lease_token: null,
        next_retry_at: terminal ? null : new Date(Date.now() + 60000),
        failureCode: succeeded ? null : raw.failure_reason || refund.failure_code || null,
        failureMessage: succeeded ? null : raw.failure_reason || refund.failure_message || null,
      },
      { transaction }
    );
    const total = await refunds.sumSucceededForTransaction(payment.id, { transaction });
    const transactionStatus =
      total >= Number(payment.amount) - 0.001
        ? 'refunded'
        : total > 0
          ? 'partially_refunded'
          : 'completed';
    await transactions.updateStatus(payment.id, transactionStatus, { transaction });
    if (succeeded) {
      // Also repairs legacy rows marked succeeded before their ledger committed.
      await ledger.recordRefundSucceeded(
        {
          refund: {
            ...(refund.toJSON ? refund.toJSON() : refund),
            provider_refund_id: providerRefund.id,
          },
          transaction: payment,
        },
        { transaction }
      );
    }
    if (['failed', 'cancelled'].includes(status)) {
      await ledger.recordRefundFailed(
        {
          refund: { ...refund.toJSON(), provider_refund_id: providerRefund.id },
          transaction: payment,
        },
        { transaction }
      );
    }
    const payload = {
      refundId: refund.id,
      transactionId: payment.id,
      bookingId: payment.booking_id,
      hotelId: payment.hotel_id,
      buyerId: payment.buyer_id,
      amount: Number(refund.amount),
      currency: refund.currency,
      status,
      transactionStatus,
    };
    if (terminal)
      await outbox.record(
        `refund-${refund.id}-${status}`,
        succeeded ? 'payment.refund_succeeded' : 'payment.refund_failed',
        payload,
        { transaction }
      );
    return {
      ...presentRefund({
        ...refund.toJSON(),
        status,
        provider_refund_id: providerRefund.id,
        workflow_state: succeeded ? 'succeeded' : terminal ? 'needs_attention' : 'provider_pending',
      }),
      transactionStatus,
    };
  });
}

module.exports = { reconcileRefund };
