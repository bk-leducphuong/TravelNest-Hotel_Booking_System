/**
 * recentSearches: entries must de-duplicate by destination/dates/guests, drop
 * stays whose check-in has passed, and only attach images for the page shown.
 */

jest.mock('@config/logger.config', () => ({ info: jest.fn(), error: jest.fn() }));
jest.mock('@config/redis.config', () => ({
  zRange: jest.fn(),
  zRem: jest.fn().mockResolvedValue(1),
  zAdd: jest.fn().mockResolvedValue(1),
  zCard: jest.fn().mockResolvedValue(1),
  zRemRangeByRank: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(true),
}));
jest.mock('@modules/catalog', () => ({
  getCityImagesByCityIds: jest.fn(),
}));

const redisClient = require('@config/redis.config');
const catalog = require('@modules/catalog');
const {
  recordRecentSearch,
  getRecentSearches,
} = require('@modules/search/application/recentSearches');

const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days) {
  return new Date(Date.now() + days * DAY).toISOString();
}

const baseSearch = {
  cityId: 'city-1',
  countryId: 'country-1',
  city: 'Ha Noi',
  country: 'Vietnam',
  latitude: null,
  longitude: null,
  radius: 10,
  checkIn: daysFromNow(7),
  checkOut: daysFromNow(9),
  adults: 2,
  children: 0,
  rooms: 1,
  sortBy: 'relevance',
  minPrice: null,
  maxPrice: null,
  minRating: null,
  hotelClass: null,
  amenities: null,
};

describe('recordRecentSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisClient.zRange.mockResolvedValue([]);
    redisClient.zCard.mockResolvedValue(1);
  });

  it('replaces an existing entry for the same destination/dates/guests', async () => {
    const previous = JSON.stringify({ ...baseSearch, createdAt: daysFromNow(-1) });
    redisClient.zRange.mockResolvedValue([previous]);

    await recordRecentSearch('user-1', { ...baseSearch, sortBy: 'price_asc' });

    expect(redisClient.zRem).toHaveBeenCalledWith('recent_searches:user:user-1', [previous]);

    const [[, added]] = redisClient.zAdd.mock.calls;
    expect(JSON.parse(added[0].value)).toMatchObject({ city: 'Ha Noi', sortBy: 'price_asc' });
  });

  it('keeps entries whose dates differ', async () => {
    const otherDates = JSON.stringify({
      ...baseSearch,
      checkIn: daysFromNow(14),
      checkOut: daysFromNow(16),
      createdAt: daysFromNow(-1),
    });
    redisClient.zRange.mockResolvedValue([otherDates]);

    await recordRecentSearch('user-1', { ...baseSearch, sortBy: 'price_desc' });

    expect(redisClient.zRem).not.toHaveBeenCalled();
    expect(redisClient.zAdd).toHaveBeenCalledTimes(1);
  });

  it('treats a sort-only change as the same search', async () => {
    const previous = JSON.stringify({
      ...baseSearch,
      sortBy: 'relevance',
      createdAt: daysFromNow(-1),
    });
    redisClient.zRange.mockResolvedValue([previous]);

    await recordRecentSearch('user-1', { ...baseSearch, sortBy: 'rating' });

    expect(redisClient.zRem).toHaveBeenCalledTimes(1);
    expect(redisClient.zRemRangeByRank).not.toHaveBeenCalled();
  });
});

describe('getRecentSearches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    catalog.getCityImagesByCityIds.mockResolvedValue(new Map());
  });

  it('hides and prunes searches whose check-in has already passed', async () => {
    const stale = JSON.stringify({
      ...baseSearch,
      checkIn: daysFromNow(-3),
      checkOut: daysFromNow(-1),
      createdAt: daysFromNow(-10),
    });
    const fresh = JSON.stringify({ ...baseSearch, createdAt: daysFromNow(-1) });
    redisClient.zRange.mockResolvedValue([fresh, stale]);

    const result = await getRecentSearches('user-1', 10);

    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBe(JSON.parse(fresh).createdAt);
    expect(redisClient.zRem).toHaveBeenCalledWith('recent_searches:user:user-1', [stale]);
  });

  it('drops malformed members', async () => {
    redisClient.zRange.mockResolvedValue(['not-json', JSON.stringify(baseSearch)]);

    const result = await getRecentSearches('user-1', 10);

    expect(result).toHaveLength(1);
    expect(redisClient.zRem).toHaveBeenCalledWith('recent_searches:user:user-1', ['not-json']);
  });

  it('attaches the primary image only for the returned page', async () => {
    const searches = Array.from({ length: 3 }, (_, index) =>
      JSON.stringify({ ...baseSearch, cityId: `city-${index + 1}`, createdAt: daysFromNow(-index) })
    );
    redisClient.zRange.mockResolvedValue(searches);
    catalog.getCityImagesByCityIds.mockResolvedValue(
      new Map([
        [
          'city-1',
          [
            { objectKey: 'secondary.jpg', isPrimary: false },
            { objectKey: 'primary.jpg', isPrimary: true },
          ],
        ],
        ['city-2', [{ objectKey: 'other.jpg', isPrimary: false }]],
      ])
    );

    const result = await getRecentSearches('user-1', 2);

    expect(result).toHaveLength(2);
    expect(catalog.getCityImagesByCityIds).toHaveBeenCalledWith(['city-1', 'city-2']);
    expect(result[0].image).toEqual({ objectKey: 'primary.jpg' });
    expect(result[1].image).toEqual({ objectKey: 'other.jpg' });
  });

  it('returns an empty list for anonymous users', async () => {
    await expect(getRecentSearches(null)).resolves.toEqual([]);
    expect(redisClient.zRange).not.toHaveBeenCalled();
  });
});
