jest.mock('@config/database.config', () => ({ transaction: jest.fn() }));
jest.mock('@modules/payment/infrastructure/refund.repository', () => ({
  findById: jest.fn(),
  update: jest.fn(),
  findLeasedForTransaction: jest.fn(),
}));
jest.mock('@modules/payment/infrastructure/transaction-admin.repository', () => ({
  findById: jest.fn(),
}));
jest.mock('@modules/payment/infrastructure/outbox.repository', () => ({ record: jest.fn() }));
jest.mock('@modules/payment/application/reconcileRefund', () => ({ reconcileRefund: jest.fn() }));
jest.mock('@modules/payment/infrastructure/adapters/stripe-payment.adapter', () => jest.fn());
const sequelize = require('@config/database.config');
const refunds = require('@modules/payment/infrastructure/refund.repository');
const transactions = require('@modules/payment/infrastructure/transaction-admin.repository');
const StripeAdapter = require('@modules/payment/infrastructure/adapters/stripe-payment.adapter');
const { reconcileRefund } = require('@modules/payment/application/reconcileRefund');
// Constructor is evaluated at import time; methods remain mocks while Jest resets their implementations.
const provider = { refundCharge: jest.fn(), getRefund: jest.fn(), findRefundForRecord: jest.fn() };
StripeAdapter.mockImplementation(() => provider);
const { processRefundAttempt } = require('@modules/payment/application/admin/processRefundAttempt');
let row;
beforeEach(() => {
  row = {
    id: 'r1',
    transaction_id: 't1',
    amount: 25,
    currency: 'USD',
    reason: 'customer_request',
    status: 'pending',
    workflow_state: 'queued',
    idempotency_key: 'cancel-b1',
    eligibility: 'eligible',
    attempt_count: 0,
  };
  sequelize.transaction.mockImplementation((callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  refunds.findById.mockImplementation(async () => ({ ...row }));
  refunds.update.mockImplementation(async (id, values) => {
    Object.assign(row, values);
  });
  transactions.findById.mockResolvedValue({ id: 't1', stripe_charge_id: 'ch1', booking_id: 'b1' });
  provider.refundCharge.mockResolvedValue({ id: 're1', status: 'succeeded', raw: {} });
  reconcileRefund.mockResolvedValue({ status: 'succeeded' });
});
it('submits a stable provider key and records its first attempt before network I/O', async () => {
  await processRefundAttempt({ refundId: 'r1' });
  expect(provider.refundCharge).toHaveBeenCalledWith(
    expect.objectContaining({
      idempotencyKey: 'refund-r1',
      amount: 2500,
      metadata: expect.objectContaining({ refund_record_id: 'r1' }),
    })
  );
  expect(row.first_attempt_at).toBeInstanceOf(Date);
});
it('does not execute duplicate work during an active lease', async () => {
  row.lease_until = new Date(Date.now() + 60000);
  await processRefundAttempt({ refundId: 'r1' });
  expect(provider.refundCharge).not.toHaveBeenCalled();
});
it('treats a timeout as uncertain and keeps its financial reservation', async () => {
  provider.refundCharge.mockRejectedValue(new Error('network timeout'));
  await processRefundAttempt({ refundId: 'r1' });
  expect(row).toMatchObject({ status: 'processing', workflow_state: 'unknown', attempt_count: 1 });
  expect(row.next_retry_at.getTime()).toBeGreaterThan(Date.now());
});
it('recovers a lost response using refund metadata instead of issuing again', async () => {
  row.first_attempt_at = new Date(Date.now() - 1000);
  provider.findRefundForRecord.mockResolvedValue({
    id: 're_existing',
    status: 'succeeded',
    raw: {},
  });
  await processRefundAttempt({ refundId: 'r1' });
  expect(provider.refundCharge).not.toHaveBeenCalled();
  expect(reconcileRefund).toHaveBeenCalledWith(
    'r1',
    expect.objectContaining({ id: 're_existing' })
  );
});
it('does not create again after the provider key retention safety window', async () => {
  row.first_attempt_at = new Date(Date.now() - 24 * 3600000);
  provider.findRefundForRecord.mockResolvedValue(null);
  await processRefundAttempt({ refundId: 'r1' });
  expect(provider.refundCharge).not.toHaveBeenCalled();
  expect(row).toMatchObject({ status: 'processing', workflow_state: 'needs_attention' });
});
it('a ledger failure after provider success never marks the refund failed', async () => {
  reconcileRefund.mockRejectedValue(new Error('ledger unavailable'));
  await expect(processRefundAttempt({ refundId: 'r1' })).rejects.toThrow('ledger unavailable');
  expect(row).toMatchObject({ status: 'processing', workflow_state: 'unknown' });
});
it('polls an existing provider refund rather than creating a replacement', async () => {
  row.provider_refund_id = 're1';
  provider.getRefund.mockResolvedValue({ id: 're1', status: 'succeeded', raw: {} });
  await processRefundAttempt({ refundId: 'r1' });
  expect(provider.getRefund).toHaveBeenCalledWith('re1');
  expect(provider.refundCharge).not.toHaveBeenCalled();
});
