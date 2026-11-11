const express = require('express');
const request = require('supertest');

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => next(),
  optionalAuthenticate: (req, res, next) => next(),
}));

jest.mock('@modules/catalog/api/hotel.controller', () => ({
  getRecentlyViewedHotels: (req, res) => res.status(200).json({ route: 'recently-viewed' }),
  getTrendingHotels: (req, res) => res.status(200).json({ route: 'trending' }),
  getHotelDetails: (req, res) =>
    res.status(200).json({ route: 'hotel-details', hotelId: req.params.hotelId }),
  searchRooms: (req, res) => res.status(200).json({ route: 'rooms' }),
  getHotelPolicies: (req, res) => res.status(200).json({ route: 'policies' }),
  getNearbyPlaces: (req, res) => res.status(200).json({ route: 'nearby-places' }),
  getHotelsByIds: (req, res) => res.status(200).json({ route: 'batch' }),
}));

const hotelRoutes = require('@modules/catalog/api/guest.routes');
const hotelSchema = require('@modules/catalog/api/guest.schema');

const buildApp = () => {
  const app = express();
  app.use('/hotels', hotelRoutes);
  return app;
};

describe('hotel.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers /recently-viewed before the parameterized hotelId route', () => {
    const routePaths = hotelRoutes.stack
      .filter((layer) => layer.route?.methods?.get)
      .map((layer) => layer.route.path);

    expect(routePaths.indexOf('/recently-viewed')).toBeGreaterThanOrEqual(0);
    expect(routePaths.indexOf('/:hotelId')).toBeGreaterThan(routePaths.indexOf('/recently-viewed'));
  });

  it('does not shadow reserved slugs with the parameterized hotelId route', async () => {
    const app = buildApp();

    const recentlyViewed = await request(app).get('/hotels/recently-viewed');
    expect(recentlyViewed.status).toBe(200);
    expect(recentlyViewed.body).toEqual({ route: 'recently-viewed' });

    const trending = await request(app).get('/hotels/trending');
    expect(trending.body).toEqual({ route: 'trending' });

    // Reserved sub-resource paths keep resolving to their own handlers.
    const hotelId = '123e4567-e89b-12d3-a456-426614174000';
    const policies = await request(app).get(`/hotels/${hotelId}/policies`);
    expect(policies.body).toEqual({ route: 'policies' });
  });

  it('captures the hotelId param so the details handler can read it', async () => {
    const hotelId = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(buildApp()).get(`/hotels/${hotelId}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: 'hotel-details', hotelId });
  });

  // Express 5 (path-to-regexp v8) removed inline regex params such as
  // `:hotelId([0-9a-fA-F-]{36})`, so the UUID shape is enforced by the Joi
  // params schema instead of the route pattern.
  it('validates the hotelId shape with the Joi params schema', () => {
    expect(
      hotelSchema.getHotelDetails.params.validate({ hotelId: 'not-a-uuid' }).error
    ).toBeDefined();
    expect(
      hotelSchema.getHotelDetails.params.validate({
        hotelId: '123e4567-e89b-12d3-a456-426614174000',
      }).error
    ).toBeUndefined();
  });
});
