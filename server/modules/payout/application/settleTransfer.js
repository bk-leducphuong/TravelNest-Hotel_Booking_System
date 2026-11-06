const sequelize = require('@config/database.config');
const paymentModule = require('@modules/payment');
const payouts = require('../infrastructure/payout.repository');

/** Keep the payout reservation until its cash debit commits; also used after a lost API response. */
async function settleTransfer(payout, transfer) {
  if (
    transfer.amount !== Math.round(Number(payout.amount) * 100) ||
    transfer.currency.toUpperCase() !== payout.currency.toUpperCase()
  ) {
    throw new Error('Provider transfer does not match payout amount/currency');
  }
  return sequelize.transaction(async (transaction) => {
    const options = { transaction };
    await paymentModule.lockHotelBalance(payout.hotel_id, payout.currency, options);
    const current = await payouts.findForClaim(payout.id, {
      ...options,
      lock: transaction.LOCK.UPDATE,
    });
    const data = current.toJSON ? current.toJSON() : current;
    await paymentModule.ledger.recordPayoutPaid(
      { payout: { ...data, provider_transfer_id: transfer.id } },
      options
    );
    await payouts.update(
      payout.id,
      { status: 'paid', providerTransferId: transfer.id, paidAt: new Date() },
      options
    );
  });
}

module.exports = { settleTransfer };
