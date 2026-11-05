const { uuidv7 } = require('uuidv7');
const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');
const refunds = require('../../infrastructure/refund.repository');
const transactions = require('../../infrastructure/transaction-admin.repository');
const outbox = require('../../infrastructure/outbox.repository');
const StripePaymentAdapter = require('../../infrastructure/adapters/stripe-payment.adapter');
const { toMinorUnits, toStripeReason } = require('../../domain/refund-rules');
const { reconcileRefund } = require('../reconcileRefund');
const adapter = new StripePaymentAdapter();
const SAFE_REPLAY_MS = 23 * 3600000;
const MAX_ATTEMPTS = 8;

async function claimRefund(refundId) {
  const initial = await refunds.findById(refundId);
  if (!initial) return null;
  return sequelize.transaction(async (transaction) => {
    const options = { transaction, lock: transaction.LOCK.UPDATE };
    const payment = await transactions.findById(initial.transaction_id, options);
    const refund = await refunds.findById(refundId, options);
    if (
      !refund.idempotency_key ||
      refund.eligibility !== 'eligible' ||
      !(Number(refund.amount) > 0) ||
      !['pending', 'processing'].includes(refund.status) ||
      refund.workflow_state === 'needs_attention' ||
      (refund.next_retry_at && new Date(refund.next_retry_at) > new Date()) ||
      (refund.lease_until && new Date(refund.lease_until) > new Date())
    )
      return null;
    if (await refunds.findLeasedForTransaction(payment.id, { transaction })) return null;
    const token = uuidv7();
    await refunds.update(
      refund.id,
      {
        status: 'processing',
        workflow_state: refund.provider_refund_id ? 'provider_pending' : 'submitting',
        attempt_count: refund.attempt_count + 1,
        first_attempt_at: refund.first_attempt_at || new Date(),
        lease_until: new Date(Date.now() + 5 * 60000),
        lease_token: token,
      },
      { transaction }
    );
    return { refund, payment, token };
  });
}

async function deferRefund(claim, error, needsAttention = false) {
  return sequelize.transaction(async (transaction) => {
    const options = { transaction, lock: transaction.LOCK.UPDATE };
    await transactions.findById(claim.payment.id, options);
    const current = await refunds.findById(claim.refund.id, options);
    if (current.lease_token !== claim.token || current.status === 'succeeded') return;
    const exhausted = needsAttention || current.attempt_count >= MAX_ATTEMPTS;
    await refunds.update(
      current.id,
      {
        status: 'processing',
        workflow_state: exhausted ? 'needs_attention' : 'unknown',
        lease_until: null,
        lease_token: null,
        next_retry_at: exhausted
          ? null
          : new Date(Date.now() + Math.min(3600000, 30000 * 2 ** (current.attempt_count - 1))),
        failureCode: error.code || 'refund_outcome_unknown',
        failureMessage: error.message,
      },
      { transaction }
    );
    if (exhausted) {
      await outbox.record(
        `refund-attention-${current.id}`,
        'payment.refund_failed',
        {
          refundId: current.id,
          transactionId: claim.payment.id,
          bookingId: claim.payment.booking_id,
          hotelId: claim.payment.hotel_id,
          buyerId: claim.payment.buyer_id,
          error: error.message,
          needsAttention: true,
        },
        { transaction }
      );
      logger.error(
        { refundId: current.id, error: error.message },
        'Refund requires manual reconciliation; funds remain reserved'
      );
    }
  });
}

async function processRefundAttempt({ refundId, refund: supplied }) {
  const claim = await claimRefund(refundId || supplied?.id);
  if (!claim) return null;
  const { refund, payment } = claim;
  let provider;
  try {
    if (refund.provider_refund_id) provider = await adapter.getRefund(refund.provider_refund_id);
    else if (refund.first_attempt_at)
      provider = await adapter.findRefundForRecord(payment.stripe_charge_id, refund.id);
    if (!provider) {
      if (
        refund.first_attempt_at &&
        Date.now() - new Date(refund.first_attempt_at).getTime() >= SAFE_REPLAY_MS
      ) {
        await deferRefund(
          claim,
          new Error('Provider idempotency window expired; reconcile before issuing a new refund'),
          true
        );
        return null;
      }
      provider = await adapter.refundCharge({
        chargeId: payment.stripe_charge_id,
        amount: toMinorUnits(refund.amount),
        reason: toStripeReason(refund.reason),
        idempotencyKey: `refund-${refund.id}`,
        metadata: {
          booking_id: payment.booking_id,
          transaction_id: payment.id,
          refund_record_id: refund.id,
        },
      });
    }
  } catch (error) {
    await deferRefund(claim, error);
    return null;
  }
  try {
    return await reconcileRefund(refund.id, provider);
  } catch (error) {
    // A local failure never means Stripe failed. The same operation is reconciled on recovery.
    await deferRefund(claim, error);
    throw error;
  }
}

module.exports = { processRefundAttempt, claimRefund, deferRefund };
