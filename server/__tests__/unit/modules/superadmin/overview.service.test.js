jest.mock('@modules/superadmin/infrastructure/platform-stats.repository', () => ({
  getOverviewSnapshot: jest.fn(),
}));

const repository = require('@modules/superadmin/infrastructure/platform-stats.repository');
const { getOverview } = require('@modules/superadmin/application/overview.service');

describe('overview.service', () => {
  it('returns the precomputed snapshot and its computed-at timestamp', async () => {
    repository.getOverviewSnapshot.mockResolvedValue({
      hotels: { total: 2, byStatus: { active: 2 } },
      users: { total: 5, byStatus: { active: 4, banned: 1 } },
      bookings: { total: 9 },
      computedAt: '2026-01-01T00:00:00.000Z',
    });

    const result = await getOverview();

    expect(result.hotels).toEqual({ total: 2, byStatus: { active: 2 } });
    expect(result.users.total).toBe(5);
    expect(result.bookings.total).toBe(9);
    expect(result.generatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.stale).toBe(false);
    expect(result.computedAt).toBeUndefined();
  });

  it('flags a missing snapshot as stale with zeroed counts', async () => {
    repository.getOverviewSnapshot.mockResolvedValue(null);

    const result = await getOverview();

    expect(result.stale).toBe(true);
    expect(result.generatedAt).toBeNull();
    expect(result.hotels).toEqual({ total: 0, byStatus: {} });
    expect(result.users.total).toBe(0);
    expect(result.bookings.total).toBe(0);
  });
});
