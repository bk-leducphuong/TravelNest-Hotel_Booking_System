jest.mock('@platform/database', () => ({
  hotel_search_snapshots: { upsert: jest.fn(), update: jest.fn() },
  hotels: { findByPk: jest.fn() },
}));

const { hotel_search_snapshots: snapshots, hotels } = require('@platform/database');
const snapshotRepository = require('@modules/catalog/infrastructure/hotel_search_snapshot.repository');

describe('hotel_search_snapshot.repository search names', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives normalized/compact hotel names on upsert', async () => {
    snapshots.upsert.mockResolvedValue([{}, 1]);

    await snapshotRepository.upsertSnapshot('h1', { hotel_name: 'Đà Nẵng Grand Hotel' });

    expect(snapshots.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        hotel_id: 'h1',
        hotel_name: 'Đà Nẵng Grand Hotel',
        hotel_name_normalized: 'da nang grand hotel',
        hotel_name_compact: 'dananggrandhotel',
      })
    );
  });

  it('leaves rows without a hotel name untouched', async () => {
    snapshots.upsert.mockResolvedValue([{}, 1]);

    await snapshotRepository.upsertSnapshot('h1', { avg_rating: 9 });

    const payload = snapshots.upsert.mock.calls[0][0];
    expect(payload).not.toHaveProperty('hotel_name_normalized');
    expect(payload).not.toHaveProperty('hotel_name_compact');
  });

  it('recomputes names on partial updates and explicit refresh', async () => {
    snapshots.update.mockResolvedValue([1]);
    hotels.findByPk.mockResolvedValue({ id: 'h1', name: 'Ha Noi Inn' });

    await snapshotRepository.partialUpdate('h1', { hotel_name: 'Sài Gòn Inn' });
    expect(snapshots.update).toHaveBeenCalledWith(
      expect.objectContaining({
        hotel_name_normalized: 'sai gon inn',
        hotel_name_compact: 'saigoninn',
      }),
      { where: { hotel_id: 'h1' } }
    );

    await snapshotRepository.refreshSearchNames('h1');
    expect(hotels.findByPk).toHaveBeenCalledWith('h1', {
      attributes: ['id', 'name'],
      raw: true,
    });
    expect(snapshots.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hotel_name: 'Ha Noi Inn',
        hotel_name_compact: 'hanoiinn',
      }),
      { where: { hotel_id: 'h1' } }
    );
  });
});
