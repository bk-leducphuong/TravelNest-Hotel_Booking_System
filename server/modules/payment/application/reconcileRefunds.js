const logger = require('@config/logger.config');
const refunds = require('../infrastructure/refund.repository');
const transactions = require('../infrastructure/transaction-admin.repository');
const StripePaymentAdapter = require('../infrastructure/adapters/stripe-payment.adapter');
const { reconcileRefund } = require('./reconcileRefund');

/** Daily provider-to-ledger sweep, including completed and needs-attention obligations. Never creates a provider refund. */
async function reconcileRefunds() {
  const adapter = new StripePaymentAdapter();
  let afterId;
  let checked = 0;
  let drift = 0;
  for (;;) {
    const page = await refunds.reconciliationPage(afterId);
    if (!page.length) break;
    for (const refund of page) {
      try {
        const payment = await transactions.findById(refund.transaction_id);
        const provider = refund.provider_refund_id
          ? await adapter.getRefund(refund.provider_refund_id)
          : await adapter.findRefundForRecord(payment.stripe_charge_id, refund.id);
        if (!provider) {
          drift++;
          logger.error(
            { refundId: refund.id },
            'Refund reconciliation could not locate provider operation; manual review required'
          );
          continue;
        }
        if (provider.status !== refund.status) drift++;
        await reconcileRefund(refund.id, provider);
        checked++;
      } catch (error) {
        drift++;
        logger.error({ refundId: refund.id, error: error.message }, 'Refund reconciliation failed');
      }
    }
    afterId = page[page.length - 1].id;
  }
  logger.info({ checked, drift }, 'Refund daily reconciliation completed');
  return { checked, drift };
}

module.exports = { reconcileRefunds };
