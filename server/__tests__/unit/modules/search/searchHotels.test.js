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
  checkAvailability: jest.fn(),
  getRoomDetails: jest.fn(),
  mergeData: jest.fn(),
}));
jest.mock('@modules/search/application/search-response', () => ({
  formatSearchResponse: jest.fn(() => ({ data: { hotels: [] } })),
  formatEmptyResponse: jest.fn(() => ({ data: { hotels: [] } })),
}));
jest.mock('@modules/search/application/attachFavoriteStatus', () => ({
  attachFavoriteStatus: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/search/domain/filters', () => ({
  applyDateSpecificFilters: jest.fn((hotels) => hotels),
}));
jest.mock('@modules/search/domain/ranking', () => ({
  rankAndSort: jest.fn((hotels) => hotels),
}));

const { searchHotels } = require('@modules/search/application/searchHotels');
const { resolveDestination } = require('@modules/search/application/resolveDestination');
const { findCandidates } = require('@modules/search/application/search-pipeline');

const params = {
  city: 'Ha Noi',
  checkIn: '2026-11-05',
  checkOut: '2026-11-07',
  adults: 2,
  children: 0,
  rooms: 1,
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
    resolveDestination.mockReset();
    findCandidates.mockReset();
  });

  it('returns the resolved destination ids and display names (no hotels found)', async () => {
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
});
