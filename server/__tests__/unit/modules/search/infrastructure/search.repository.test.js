jest.mock('@config/logger.config', () => ({ warn: jest.fn(), debug: jest.fn(), error: jest.fn() }));
jest.mock('@config/database.config', () => ({ query: jest.fn() }));
jest.mock('@platform/database', () => ({
  hotel_search_snapshots: { findAll: jest.fn() },
}));

const sequelize = require('@config/database.config');
const { hotel_search_snapshots } = require('@platform/database');
const searchRepository = require('@modules/search/infrastructure/search.repository');

describe('search.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findCandidateHotels', () => {
    it('normalizes decimal/JSON columns from the driver', async () => {
      sequelize.query.mockResolvedValue([
        {
          hotel_id: 'h1',
          hotel_name: 'Hotel One',
          latitude: '21.0285000',
          longitude: '105.8542000',
          distance_km: '1.23456',
          avg_rating: '8.75',
          review_count: 12,
          hotel_class: 4,
          amenity_codes: '["WIFI","POOL"]',
          has_free_cancellation: 0,
          total_bookings: 30,
          view_count: null,
          name_match_tier: 2,
        },
      ]);

      const [candidate] = await searchRepository.findCandidateHotels({ cityId: 'c1' });

      expect(candidate).toMatchObject({
        hotel_id: 'h1',
        latitude: 21.0285,
        longitude: 105.8542,
        distance_km: 1.23,
        avg_rating: 8.75,
        review_count: 12,
        hotel_class: 4,
        amenity_codes: ['WIFI', 'POOL'],
        has_free_cancellation: false,
        total_bookings: 30,
        view_count: 0,
        name_match_tier: 2,
      });
    });

    it('caps a text-only result set but never a location-filtered one', async () => {
      const row = { hotel_id: 'h', hotel_name: 'H', amenity_codes: null };

      sequelize.query.mockResolvedValue(Array.from({ length: 5 }, () => row));
      const capped = await searchRepository.findCandidateHotels({ cityId: 'c1' });
      expect(capped).toHaveLength(5);

      sequelize.query.mockResolvedValue(
        Array.from({ length: searchRepository.textCandidateCap + 10 }, () => row)
      );
      const textOnly = await searchRepository.findCandidateHotels({ nameText: 'Grand' });
      expect(textOnly).toHaveLength(searchRepository.textCandidateCap);
    });
  });

  describe('findOffersForHotels', () => {
    it('runs a single query for a normal candidate set', async () => {
      sequelize.query.mockResolvedValue([]);

      await searchRepository.findOffersForHotels({
        hotelIds: ['h1', 'h2'],
        checkIn: '2026-11-10',
        checkOut: '2026-11-12',
        nights: 2,
        rooms: 1,
        totalGuests: 2,
      });

      expect(sequelize.query).toHaveBeenCalledTimes(1);
    });

    it('chunks very large candidate sets so the index plan is kept', async () => {
      sequelize.query.mockResolvedValue([]);
      const hotelIds = Array.from({ length: 4500 }, (_, index) => `h${index}`);

      await searchRepository.findOffersForHotels({
        hotelIds,
        checkIn: '2026-11-10',
        checkOut: '2026-11-12',
        nights: 2,
        rooms: 1,
        totalGuests: 2,
      });

      expect(sequelize.query).toHaveBeenCalledTimes(3);
    });

    it('returns no rows without hotel ids', async () => {
      await expect(searchRepository.findOffersForHotels({ hotelIds: [] })).resolves.toEqual([]);
      expect(sequelize.query).not.toHaveBeenCalled();
    });
  });

  describe('getSnapshotsByIds', () => {
    it('queries snapshots once for all ids', async () => {
      hotel_search_snapshots.findAll.mockResolvedValue([
        { hotel_id: 'h1', hotel_name: 'One', amenity_codes: null },
      ]);

      const snapshots = await searchRepository.getSnapshotsByIds(['h1']);

      expect(snapshots).toHaveLength(1);
      expect(hotel_search_snapshots.findAll).toHaveBeenCalledTimes(1);
    });

    it('returns [] without ids', async () => {
      await expect(searchRepository.getSnapshotsByIds([])).resolves.toEqual([]);
      expect(hotel_search_snapshots.findAll).not.toHaveBeenCalled();
    });
  });
});
