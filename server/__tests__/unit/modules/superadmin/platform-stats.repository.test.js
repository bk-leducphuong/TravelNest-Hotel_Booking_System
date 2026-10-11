jest.mock('@models/index.js', () => ({
  sequelize: {},
  Sequelize: { fn: jest.fn(), col: jest.fn() },
  hotels: {},
  users: {},
  bookings: {},
  transactions: {},
  refunds: {},
  payouts: {},
  platform_status_counts: { findAll: jest.fn() },
  platform_finance_totals: { findAll: jest.fn() },
}));

const db = require('@models/index.js');
const {
  getOverviewSnapshot,
  getFinanceOverviewSnapshot,
} = require('@modules/superadmin/infrastructure/platform-stats.repository');

describe('platform-stats.repository (snapshot shaping)', () => {
  describe('getOverviewSnapshot', () => {
    it('shapes status rows into totals and per-status buckets', async () => {
      db.platform_status_counts.findAll.mockResolvedValue([
        {
          metric: 'hotels',
          status: '__total__',
          count: 10,
          computed_at: '2026-01-01T00:00:00.000Z',
        },
        { metric: 'hotels', status: 'active', count: 8, computed_at: '2026-01-01T00:00:00.000Z' },
        { metric: 'hotels', status: 'pending', count: 2, computed_at: '2026-01-01T00:00:00.000Z' },
        { metric: 'users', status: '__total__', count: 5, computed_at: '2026-01-01T00:00:00.000Z' },
        { metric: 'users', status: 'banned', count: 1, computed_at: '2026-01-01T00:00:00.000Z' },
        {
          metric: 'bookings',
          status: '__total__',
          count: 3,
          computed_at: '2026-01-01T00:00:00.000Z',
        },
      ]);

      const snapshot = await getOverviewSnapshot();

      expect(snapshot.hotels).toEqual({ total: 10, byStatus: { active: 8, pending: 2 } });
      expect(snapshot.users).toEqual({ total: 5, byStatus: { banned: 1 } });
      expect(snapshot.bookings).toEqual({ total: 3 });
      expect(snapshot.computedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('returns null when the snapshot is empty', async () => {
      db.platform_status_counts.findAll.mockResolvedValue([]);

      expect(await getOverviewSnapshot()).toBeNull();
    });
  });

  describe('getFinanceOverviewSnapshot', () => {
    it('groups finance rows by metric and coerces amounts to numbers', async () => {
      db.platform_finance_totals.findAll.mockResolvedValue([
        {
          metric: 'gross',
          currency: 'USD',
          count: 3,
          amount: '360.00',
          computed_at: '2026-01-01T00:00:00.000Z',
        },
        {
          metric: 'refunds',
          currency: 'USD',
          count: 1,
          amount: '50.00',
          computed_at: '2026-01-01T00:00:00.000Z',
        },
        {
          metric: 'payouts_paid',
          currency: 'USD',
          count: 1,
          amount: '200.00',
          computed_at: '2026-01-01T00:00:00.000Z',
        },
      ]);

      const snapshot = await getFinanceOverviewSnapshot();

      expect(snapshot.gross).toEqual([{ currency: 'USD', count: 3, amount: 360 }]);
      expect(snapshot.refunds).toEqual([{ currency: 'USD', count: 1, amount: 50 }]);
      expect(snapshot.payoutsPaid).toEqual([{ currency: 'USD', count: 1, amount: 200 }]);
      expect(snapshot.payoutsPending).toEqual([]);
      expect(snapshot.computedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('returns null when the snapshot is empty', async () => {
      db.platform_finance_totals.findAll.mockResolvedValue([]);

      expect(await getFinanceOverviewSnapshot()).toBeNull();
    });
  });
});
