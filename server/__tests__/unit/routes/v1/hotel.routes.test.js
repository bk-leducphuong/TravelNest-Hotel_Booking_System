jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => next(),
  optionalAuthenticate: (req, res, next) => next(),
}));

jest.mock('@controllers/v1/hotel.controller.js', () => ({
  getRecentlyViewedHotels: (req, res) => res.status(200).json({ route: 'recently-viewed' }),
  getTrendingHotels: (req, res) => res.status(200).json({ route: 'trending' }),
  getHotelDetails: (req, res) =>
    res.status(200).json({ route: 'hotel-details', hotelId: req.params.hotelId }),
  searchRooms: (req, res) => res.status(200).json({ route: 'rooms' }),
  getHotelPolicies: (req, res) => res.status(200).json({ route: 'policies' }),
  getNearbyPlaces: (req, res) => res.status(200).json({ route: 'nearby-places' }),
}));

const hotelRoutes = require('@routes/v1/hotel.routes');
describe('hotel.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers /recently-viewed before the parameterized hotelId route', () => {
    const routePaths = hotelRoutes.stack
      .filter((layer) => layer.route?.methods?.get)
      .map((layer) => layer.route.path);

    const recentlyViewedIndex = routePaths.indexOf('/recently-viewed');
    const hotelDetailsIndex = routePaths.indexOf('/:hotelId([0-9a-fA-F-]{36})');

    expect(recentlyViewedIndex).toBeGreaterThanOrEqual(0);
    expect(hotelDetailsIndex).toBeGreaterThan(recentlyViewedIndex);
  });

  it('constrains the hotelId route to UUID-like paths so reserved slugs do not match it', () => {
    const hotelDetailsLayer = hotelRoutes.stack.find(
      (layer) => layer.route?.path === '/:hotelId([0-9a-fA-F-]{36})'
    );

    expect(hotelDetailsLayer).toBeDefined();
    expect(hotelDetailsLayer.regexp.test('/123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(hotelDetailsLayer.regexp.test('/recently-viewed')).toBe(false);
  });
});
