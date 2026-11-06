jest.mock('@config/database.config', () => ({ transaction: jest.fn() }));
jest.mock('@modules/payment', () => ({
  lockHotelBalance: jest.fn(),
  ledger: { recordPayoutPaid: jest.fn() },
}));
jest.mock('@modules/payout/infrastructure/payout.repository', () => ({
  findForClaim: jest.fn(),
  update: jest.fn(),
}));
const sequelize = require('@config/database.config');
const payments = require('@modules/payment');
const payouts = require('@modules/payout/infrastructure/payout.repository');
const { settleTransfer } = require('@modules/payout/application/settleTransfer');
const payout = { id: 'p1', hotel_id: 'h1', amount: 90, currency: 'USD' };
it('posts the cash debit and paid status in the same locked transaction', async () => {
  const tx = { LOCK: { UPDATE: 'UPDATE' } };
  sequelize.transaction.mockImplementation((callback) => callback(tx));
  payouts.findForClaim.mockResolvedValue(payout);
  await settleTransfer(payout, { id: 'tr1', amount: 9000, currency: 'usd' });
  expect(payments.lockHotelBalance).toHaveBeenCalledWith('h1', 'USD', { transaction: tx });
  expect(payments.ledger.recordPayoutPaid).toHaveBeenCalledWith(
    expect.objectContaining({ payout: expect.objectContaining({ provider_transfer_id: 'tr1' }) }),
    { transaction: tx }
  );
  expect(payouts.update).toHaveBeenCalledWith('p1', expect.objectContaining({ status: 'paid' }), {
    transaction: tx,
  });
});
it('does not change payout status if the ledger cannot commit', async () => {
  sequelize.transaction.mockImplementation((callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  payouts.findForClaim.mockResolvedValue(payout);
  payments.ledger.recordPayoutPaid.mockRejectedValue(new Error('ledger unavailable'));
  await expect(
    settleTransfer(payout, { id: 'tr1', amount: 9000, currency: 'usd' })
  ).rejects.toThrow('ledger unavailable');
  expect(payouts.update).not.toHaveBeenCalled();
});
it('rejects a transfer for a different amount before touching the database', async () => {
  await expect(settleTransfer(payout, { id: 'tr1', amount: 100, currency: 'usd' })).rejects.toThrow(
    'does not match'
  );
  expect(sequelize.transaction).not.toHaveBeenCalled();
});
