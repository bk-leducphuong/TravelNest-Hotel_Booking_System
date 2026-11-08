jest.mock('@modules/analytics', () => ({
  analytics: { getTrendingDestinations: jest.fn() },
}));
jest.mock('@modules/catalog', () => ({
  getActiveDestinationById: jest.fn(),
  getCityImagesByCityIds: jest.fn(),
  getActiveHotelCountsByDestination: jest.fn(),
}));

const { analytics } = require('@modules/analytics');
const catalog = require('@modules/catalog');
const { getTrendingDestinations } = require('@modules/search/application/getTrendingDestinations');

describe('search getTrendingDestinations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    catalog.getCityImagesByCityIds.mockResolvedValue(new Map());
    catalog.getActiveHotelCountsByDestination.mockResolvedValue({ byCity: {}, byCountry: {} });
  });

  it('adds active hotel counts for city and country destinations', async () => {
    analytics.getTrendingDestinations.mockResolvedValue([
      { destinationId: 'dest-city', searchCount: '10', uniqueUsers: '4' },
      { destinationId: 'dest-country', searchCount: '5', uniqueUsers: '2' },
    ]);
    catalog.getActiveDestinationById
      .mockResolvedValueOnce({
        id: 'dest-city',
        type: 'city',
        city_id: 'city-1',
        country_id: 'country-1',
        display_name: 'Hanoi',
        country_name: 'Vietnam',
      })
      .mockResolvedValueOnce({
        id: 'dest-country',
        type: 'country',
        city_id: null,
        country_id: 'country-2',
        display_name: 'Japan',
        country_name: 'Japan',
      });
    catalog.getCityImagesByCityIds.mockResolvedValue(
      new Map([['city-1', [{ objectKey: 'cities/hanoi.webp', isPrimary: true }]]])
    );
    catalog.getActiveHotelCountsByDestination.mockResolvedValue({
      byCity: { 'city-1': 12 },
      byCountry: { 'country-2': 34 },
    });

    const result = await getTrendingDestinations({ limit: 5, days: 30 });

    expect(catalog.getActiveHotelCountsByDestination).toHaveBeenCalledWith({
      cityIds: ['city-1'],
      countryIds: ['country-2'],
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'dest-city',
        hotelCount: 12,
        searchCount: 10,
        uniqueUsers: 4,
        images: { primary: { objectKey: 'cities/hanoi.webp', isPrimary: true } },
      }),
      expect.objectContaining({ id: 'dest-country', hotelCount: 34, images: null }),
    ]);
  });

  it('defaults the hotel count to zero when a destination has no hotels', async () => {
    analytics.getTrendingDestinations.mockResolvedValue([{ destinationId: 'dest-city' }]);
    catalog.getActiveDestinationById.mockResolvedValue({
      id: 'dest-city',
      type: 'city',
      city_id: 'city-1',
      display_name: 'Hanoi',
    });

    const result = await getTrendingDestinations();

    expect(result[0].hotelCount).toBe(0);
  });
});
