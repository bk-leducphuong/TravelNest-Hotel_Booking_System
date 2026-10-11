jest.mock('@modules/superadmin/infrastructure/superadmin.repository', () => ({
  getPlatformOverview: jest.fn(),
}));
jest.mock('@modules/superadmin/infrastructure/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

const repository = require('@modules/superadmin/infrastructure/superadmin.repository');
const cache = require('@modules/superadmin/infrastructure/cache');
const { getOverview } = require('@modules/superadmin/application/overview.service');

describe('overview.service', () => {
  it('returns the cached overview on a cache hit', async () => {
    cache.get.mockResolvedValue({ hotels: { total: 1, byStatus: {} } });

    const result = await getOverview();

    expect(result).toEqual({ hotels: { total: 1, byStatus: {} } });
    expect(repository.getPlatformOverview).not.toHaveBeenCalled();
  });

  it('computes and caches the overview on a miss', async () => {
    cache.get.mockResolvedValue(null);
    repository.getPlatformOverview.mockResolvedValue({
      hotels: { total: 2, byStatus: {} },
      users: { total: 5, byStatus: {} },
      bookings: { total: 9 },
    });

    const result = await getOverview();

    expect(result.hotels.total).toBe(2);
    expect(typeof result.generatedAt).toBe('string');
    expect(cache.set).toHaveBeenCalledWith(
      'superadmin:overview',
      expect.objectContaining({ hotels: { total: 2, byStatus: {} } }),
      expect.any(Number)
    );
  });
});
