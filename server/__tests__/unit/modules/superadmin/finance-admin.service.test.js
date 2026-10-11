jest.mock('@modules/superadmin/infrastructure/finance.repository', () => ({
  listPayments: jest.fn(),
  listRefunds: jest.fn(),
  listPayouts: jest.fn(),
  listLedgerEntries: jest.fn(),
}));
jest.mock('@modules/superadmin/infrastructure/platform-stats.repository', () => ({
  getFinanceOverviewSnapshot: jest.fn(),
}));

const repository = require('@modules/superadmin/infrastructure/finance.repository');
const statsRepository = require('@modules/superadmin/infrastructure/platform-stats.repository');
const finance = require('@modules/superadmin/application/finance-admin.service');

function paymentRow() {
  return {
    id: 't1',
    toJSON: () => ({
      id: 't1',
      booking_id: 'b1',
      amount: '120.00',
      currency: 'USD',
      status: 'completed',
      payment_method: 'card',
      created_at: '2024-01-01T00:00:00.000Z',
      completed_at: '2024-01-01T00:05:00.000Z',
      hotel: { id: 'h1', name: 'Grand Hotel' },
      transaction_buyer: { id: 'u1', email: 'buyer@example.com' },
    }),
  };
}

function payoutRow() {
  return {
    id: 'p1',
    toJSON: () => ({
      id: 'p1',
      amount: '500.00',
      currency: 'USD',
      platform_fee_amount: '50.00',
      status: 'paid',
      period_start: '2024-01-01T00:00:00.000Z',
      period_end: '2024-01-31T00:00:00.000Z',
      paid_at: '2024-02-01T00:00:00.000Z',
      created_at: '2024-02-01T00:00:00.000Z',
      hotel: { id: 'h1', name: 'Grand Hotel' },
      owner: { id: 'o1', email: 'owner@example.com' },
    }),
  };
}

function ledgerRow() {
  return {
    id: 'l1',
    toJSON: () => ({
      id: 'l1',
      direction: 'credit',
      amount: '120.00',
      currency: 'USD',
      event_type: 'payment_succeeded',
      description: 'Payment captured',
      posted_at: '2024-01-01T00:00:00.000Z',
      ledger_account: {
        id: 'a1',
        name: 'Platform Cash',
        account_type: 'platform_cash',
        currency: 'USD',
      },
      hotel: { id: 'h1', name: 'Grand Hotel' },
      booking_id: 'b1',
      transaction_id: 't1',
      payment_id: null,
      refund_id: null,
      payout_id: null,
    }),
  };
}

describe('finance-admin.service', () => {
  describe('getFinanceOverview', () => {
    it('returns the precomputed snapshot with its computed-at timestamp', async () => {
      statsRepository.getFinanceOverviewSnapshot.mockResolvedValue({
        gross: [{ currency: 'USD', count: 3, amount: 360 }],
        refunds: [],
        payoutsPaid: [],
        payoutsPending: [],
        computedAt: '2026-01-01T00:00:00.000Z',
      });

      const result = await finance.getFinanceOverview();

      expect(result.gross).toEqual([{ currency: 'USD', count: 3, amount: 360 }]);
      expect(result.generatedAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.stale).toBe(false);
      expect(result.computedAt).toBeUndefined();
    });

    it('flags a missing snapshot as stale', async () => {
      statsRepository.getFinanceOverviewSnapshot.mockResolvedValue(null);

      const result = await finance.getFinanceOverview();

      expect(result.stale).toBe(true);
      expect(result.generatedAt).toBeNull();
      expect(result.gross).toEqual([]);
      expect(result.payoutsPending).toEqual([]);
    });
  });

  describe('listPayments', () => {
    it('masks the buyer email by default', async () => {
      repository.listPayments.mockResolvedValue({ rows: [paymentRow()], count: 1 });

      const result = await finance.listPayments({}, {});

      expect(result.payments[0].buyer.email).toBe('bu•••@example.com');
      expect(result.payments[0].hotel).toEqual({ id: 'h1', name: 'Grand Hotel' });
      expect(result.total).toBe(1);
    });

    it('unmasks the buyer email when unmaskPii is true', async () => {
      repository.listPayments.mockResolvedValue({ rows: [paymentRow()], count: 1 });

      const result = await finance.listPayments({}, { unmaskPii: true });

      expect(result.payments[0].buyer.email).toBe('buyer@example.com');
    });
  });

  describe('listPayouts', () => {
    it('masks the owner email and serializes amounts', async () => {
      repository.listPayouts.mockResolvedValue({ rows: [payoutRow()], count: 1 });

      const result = await finance.listPayouts({}, {});

      expect(result.payouts[0].owner.email).toBe('ow•••@example.com');
      expect(result.payouts[0].platformFeeAmount).toBe('50.00');
      expect(result.payouts[0].status).toBe('paid');
    });
  });

  describe('listLedgerEntries', () => {
    it('serializes the account and references', async () => {
      repository.listLedgerEntries.mockResolvedValue({ rows: [ledgerRow()], count: 1 });

      const result = await finance.listLedgerEntries({});

      expect(result.entries[0].account).toEqual({
        id: 'a1',
        name: 'Platform Cash',
        accountType: 'platform_cash',
        currency: 'USD',
      });
      expect(result.entries[0].refs).toEqual({
        bookingId: 'b1',
        transactionId: 't1',
        paymentId: null,
        refundId: null,
        payoutId: null,
      });
    });
  });
});
