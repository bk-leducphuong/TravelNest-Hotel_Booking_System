/**
 * search.controller: the recent-search record must carry the resolved
 * destination ids, otherwise /search/recent can never render a city image.
 */

jest.mock('@modules/search/application/searchHotels', () => ({ searchHotels: jest.fn() }));
jest.mock('@modules/search/application/getHotelAvailability', () => ({
  getHotelAvailability: jest.fn(),
}));
jest.mock('@modules/search/application/recentSearches', () => ({
  getRecentSearches: jest.fn(),
  recordRecentSearch: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/search/application/getTrendingDestinations', () => ({
  getTrendingDestinations: jest.fn(),
}));
jest.mock('@modules/search/application/autocomplete', () => ({
  getAutocompleteSuggestions: jest.fn(),
  getDestinationAutocomplete: jest.fn(),
}));
jest.mock('@modules/search/application/saveSearchLog', () => ({
  saveSearchLog: jest.fn().mockResolvedValue({ eventId: 'e1' }),
}));
jest.mock('@modules/search/application/ipLocation', () => ({
  getIpLocation: jest.fn(),
}));

const { searchHotels, getIpLocation } = require('@modules/search/api/search.controller');
const searchUseCases = require('@modules/search/application/searchHotels');
const { recordRecentSearch } = require('@modules/search/application/recentSearches');
const { saveSearchLog } = require('@modules/search/application/saveSearchLog');
const { getIpLocation: getIpLocationUseCase } = require('@modules/search/application/ipLocation');

// `resetMocks: true` in jest.config.js wipes the implementations declared in the
// `jest.mock` factories above before every test, so re-apply the ones the
// controller awaits (the analytics calls are fire-and-forget and must resolve).
beforeEach(() => {
  recordRecentSearch.mockResolvedValue(undefined);
  saveSearchLog.mockResolvedValue({ eventId: 'e1' });
});

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

const baseQuery = {
  city: 'Ha Noi',
  checkIn: '2026-11-05',
  checkOut: '2026-11-07',
  adults: '2',
};

describe('search.controller.searchHotels', () => {
  it('records the resolved city id/country id for a city search', async () => {
    searchUseCases.searchHotels.mockResolvedValue({
      destination: {
        id: 'dest-1',
        type: 'city',
        city_id: 'city-1',
        country_id: 'country-1',
        display_name: 'Ha Noi',
        country_name: 'Vietnam',
      },
      searchResults: { data: { pagination: { total: 0 }, search_metadata: {} } },
    });

    const req = { query: { ...baseQuery }, user: { id: 'user-1' } };
    await searchHotels(req, mockRes(), jest.fn());

    expect(recordRecentSearch).toHaveBeenCalledTimes(1);
    expect(recordRecentSearch).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        cityId: 'city-1',
        countryId: 'country-1',
        city: 'Ha Noi',
        country: 'Vietnam',
      })
    );
  });

  it('records the country as the city for a country search', async () => {
    searchUseCases.searchHotels.mockResolvedValue({
      destination: {
        id: 'dest-2',
        type: 'country',
        city_id: null,
        country_id: 'country-1',
        display_name: 'Vietnam',
        country_name: 'Vietnam',
      },
      searchResults: { data: { pagination: { total: 0 }, search_metadata: {} } },
    });

    const req = {
      query: {
        country: 'Vietnam',
        checkIn: baseQuery.checkIn,
        checkOut: baseQuery.checkOut,
        adults: '2',
      },
      user: { id: 'user-2' },
    };
    await searchHotels(req, mockRes(), jest.fn());

    expect(recordRecentSearch).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({ cityId: null, countryId: 'country-1', country: 'Vietnam' })
    );
  });

  it('passes the pay-at-property filter through to the search use case', async () => {
    searchUseCases.searchHotels.mockResolvedValue({
      destination: null,
      searchResults: { data: { pagination: { total: 0 }, search_metadata: {} } },
    });

    const req = {
      query: { ...baseQuery, freeCancellation: 'true', payAtProperty: 'true' },
      user: { id: 'user-3' },
    };
    await searchHotels(req, mockRes(), jest.fn());

    expect(searchUseCases.searchHotels).toHaveBeenCalledWith(
      expect.objectContaining({ freeCancellation: true, payAtProperty: true }),
      'user-3'
    );
  });

  it('does not record a recent search for anonymous users', async () => {
    searchUseCases.searchHotels.mockResolvedValue({
      destination: null,
      searchResults: { data: { pagination: { total: 0 }, search_metadata: {} } },
    });

    const req = { query: { ...baseQuery }, user: null };
    await searchHotels(req, mockRes(), jest.fn());

    expect(recordRecentSearch).not.toHaveBeenCalled();
  });
});

describe('search.controller.searchMapHotels', () => {
  it('returns compact results with limits independently of list pagination', async () => {
    jest.clearAllMocks();
    searchUseCases.searchHotels.mockResolvedValue({
      searchResults: {
        data: {
          hotels: [
            {
              hotel_id: 'h1',
              min_price_for_dates: 100,
              available_rooms: [{ room_id: 1 }],
              selected_offer: { room_id: 1 },
            },
          ],
          pagination: { total: 205, hasNextPage: true },
        },
      },
    });
    const req = {
      query: {
        checkIn: '2099-01-01',
        checkOut: '2099-01-03',
        adults: 2,
        north: 11,
        south: 10,
        east: 107,
        west: 106,
        hotelClass: '4,5',
        amenities: 'wifi,pool',
      },
    };
    const res = mockRes();
    await require('@modules/search/api/search.controller').searchMapHotels(req, res, jest.fn());
    expect(searchUseCases.searchHotels).toHaveBeenCalledWith(
      expect.objectContaining({
        mapSearch: true,
        page: 1,
        limit: 200,
        bounds: { north: 11, south: 10, east: 107, west: 106 },
        hotelClass: [4, 5],
        amenities: ['WIFI', 'POOL'],
      }),
      null
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        hotels: [{ hotel_id: 'h1', min_price_for_dates: 100 }],
        total: 205,
        hasMore: true,
        limit: 200,
      },
    });
    expect(recordRecentSearch).not.toHaveBeenCalled();
  });

  it('searches around a map center and radius when no bounds are supplied', async () => {
    searchUseCases.searchHotels.mockResolvedValue({
      searchResults: { data: { hotels: [], pagination: { total: 0, hasNextPage: false } } },
    });
    const req = {
      query: {
        checkIn: '2099-01-01',
        checkOut: '2099-01-03',
        adults: 2,
        latitude: '21.03',
        longitude: '105.85',
        radius: '5',
      },
    };
    const res = mockRes();

    await require('@modules/search/api/search.controller').searchMapHotels(req, res, jest.fn());

    const params = searchUseCases.searchHotels.mock.calls.at(-1)[0];
    expect(params).toEqual(
      expect.objectContaining({
        mapSearch: true,
        latitude: 21.03,
        longitude: 105.85,
        radius: 5,
      })
    );
    expect(params).not.toHaveProperty('bounds');
  });
});

describe('search.controller.getIpLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the approximate location and never the raw IP', async () => {
    const location = {
      available: true,
      country: 'VN',
      city: 'Hanoi',
      latitude: 21.03,
      longitude: 105.85,
      source: 'cloudflare',
    };
    getIpLocationUseCase.mockResolvedValue(location);
    const req = { ip: '203.0.113.4', headers: { 'cf-ray': 'ray-1' }, connection: {} };
    const res = mockRes();

    await getIpLocation(req, res, jest.fn());

    expect(getIpLocationUseCase).toHaveBeenCalledWith('203.0.113.4', req.headers);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: location });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('203.0.113.4');
  });
});
