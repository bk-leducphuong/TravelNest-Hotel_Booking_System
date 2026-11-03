/**
 * searchHotels: the resolved destination must keep its display fields.
 * The recent-search recorder reads city_id/country_id/display_name from this
 * return value; narrowing it to { id, type } silently nulls the stored city.
 */

jest.mock('@config/logger.config', () => ({ info: jest.fn(), error: jest.fn() }));
jest.mock('@modules/search/application/resolveDestination', () => ({
  resolveDestination: jest.fn(),
}));
jest.mock('@modules/search/application/search-pipeline', () => ({
  findCandidates: jest.fn(),
  getOffers: jest.fn(),
  buildHotelResults: jest.fn(),
}));
jest.mock('@modules/search/application/search-response', () => ({
  formatSearchResponse: jest.fn(() => ({ data: { hotels: [] } })),
  formatEmptyResponse: jest.fn(() => ({ data: { hotels: [] } })),
}));
jest.mock('@modules/search/application/attachFavoriteStatus', () => ({
  attachFavoriteStatus: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/search/domain/ranking', () => ({
  rankAndSort: jest.fn((hotels) => hotels),
}));

const { searchHotels } = require('@modules/search/application/searchHotels');
const { resolveDestination } = require('@modules/search/application/resolveDestination');
const {
  findCandidates,
  getOffers,
  buildHotelResults,
} = require('@modules/search/application/search-pipeline');
const { rankAndSort } = require('@modules/search/domain/ranking');
const {
  formatSearchResponse,
  formatEmptyResponse,
} = require('@modules/search/application/search-response');

const params = {
  city: 'Ha Noi',
  checkIn: '2026-11-05',
  checkOut: '2026-11-07',
  adults: 2,
  children: 0,
  rooms: 1,
  page: 1,
  limit: 20,
  sortBy: 'relevance',
};

const resolvedCity = {
  id: 'dest-1',
  type: 'city',
  city_id: 'city-1',
  country_id: 'country-1',
  display_name: 'Ha Noi',
  country_name: 'Vietnam',
  normalized_name: 'ha noi',
  slug: 'ha-noi',
};

describe('searchHotels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // resetMocks wipes factory implementations between tests.
    rankAndSort.mockImplementation((hotels) => hotels);
    formatSearchResponse.mockReturnValue({ data: { hotels: [] } });
    formatEmptyResponse.mockReturnValue({ data: { hotels: [] } });
  });

  it('returns the resolved destination ids and display names (no candidates)', async () => {
    resolveDestination.mockResolvedValue(resolvedCity);
    findCandidates.mockResolvedValue([]);

    const result = await searchHotels(params, 'user-1');

    expect(result.destination).toEqual({
      id: 'dest-1',
      type: 'city',
      city_id: 'city-1',
      country_id: 'country-1',
      display_name: 'Ha Noi',
      country_name: 'Vietnam',
    });
    expect(formatEmptyResponse).toHaveBeenCalled();
    expect(getOffers).not.toHaveBeenCalled();
  });

  it('returns null destination fields when nothing resolves', async () => {
    resolveDestination.mockResolvedValue(null);
    findCandidates.mockResolvedValue([]);

    const result = await searchHotels(params, 'user-1');

    expect(result.destination).toEqual({
      id: null,
      type: null,
      city_id: null,
      country_id: null,
      display_name: null,
      country_name: null,
    });
  });

  it('resolves the city id and does not pass hotel-name intent when a destination resolved', async () => {
    resolveDestination.mockResolvedValue(resolvedCity);
    findCandidates.mockResolvedValue([{ hotel_id: 'h1' }]);
    getOffers.mockResolvedValue(new Map());
    buildHotelResults.mockReturnValue([]);

    await searchHotels(params, 'user-1');

    expect(findCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ cityId: 'city-1', countryId: 'country-1', nameText: null })
    );
    expect(formatEmptyResponse).toHaveBeenCalled();
  });

  it('treats unresolved text as hotel-name intent and caps nothing itself', async () => {
    resolveDestination.mockResolvedValue(null);
    findCandidates.mockResolvedValue([{ hotel_id: 'h1' }]);
    getOffers.mockResolvedValue(new Map());
    buildHotelResults.mockReturnValue([]);

    await searchHotels({ ...params, city: 'La Siesta' }, 'user-1');

    expect(findCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ cityId: null, countryId: null, nameText: 'La Siesta' })
    );
  });

  it('ranks the complete eligible set and formats the response', async () => {
    resolveDestination.mockResolvedValue(resolvedCity);
    findCandidates.mockResolvedValue([{ hotel_id: 'h1' }, { hotel_id: 'h2' }]);
    getOffers.mockResolvedValue(new Map([['h1', []]]));
    const eligible = [{ hotel_id: 'h1' }, { hotel_id: 'h2' }];
    buildHotelResults.mockReturnValue(eligible);

    const result = await searchHotels(params, null);

    expect(rankAndSort).toHaveBeenCalledWith(eligible, 'relevance', expect.any(Object));
    expect(formatSearchResponse).toHaveBeenCalledWith(
      eligible,
      expect.any(Object),
      2,
      expect.any(Number)
    );
    expect(result.searchResults).toEqual({ data: { hotels: [] } });
  });
});
