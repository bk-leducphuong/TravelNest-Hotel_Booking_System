const sequelize = require('@config/database.config');
const StripePaymentAdapter = require('../../infrastructure/adapters/stripe-payment.adapter');
const refunds = require('../../infrastructure/refund.repository');
const transactions = require('../../infrastructure/transaction.repository');
const { fromMinorUnits } = require('../../domain/money');
const { reconcileRefund } = require('../reconcileRefund');
const adapter = new StripePaymentAdapter();

async function handleRefundSucceeded({ refundId }) {
  if (!refundId) throw new Error('Provider refund ID is required');
  // Read authoritative provider state so delayed/out-of-order events cannot regress it.
  const provider = await adapter.getRefund(refundId);
  const raw = provider.raw;
  const localId = await sequelize.transaction(async (transaction) => {
    const options = { transaction, lock: transaction.LOCK.UPDATE };
    const payment = await transactions.findByChargeId(raw.charge, options);
    if (!payment) throw new Error('Payment for provider refund not found');
    let refund = await refunds.findByProviderRefundId(raw.id, options);
    if (!refund && raw.metadata?.refund_record_id) {
      refund = await refunds.findById(raw.metadata.refund_record_id, options);
      if (!refund || refund.transaction_id !== payment.id)
        throw new Error('Provider refund metadata does not match payment');
    }
    if (!refund) {
      refund = await refunds.create(
        {
          bookingId: payment.booking_id,
          transactionId: payment.id,
          buyerId: payment.buyer_id,
          hotelId: payment.hotel_id,
          amount: fromMinorUnits(raw.amount, raw.currency),
          currency: raw.currency.toUpperCase(),
          providerRefundId: raw.id,
          status: 'processing',
          reason: 'customer_request',
          eligibility: 'eligible',
          idempotencyKey: `external-${raw.id}`,
          workflowState: 'provider_pending',
          metadata: { source: 'stripe_webhook' },
        },
        { transaction }
      );
    }
    return refund.id;
  });
  return reconcileRefund(localId, provider);
}

module.exports = { handleRefundSucceeded };
