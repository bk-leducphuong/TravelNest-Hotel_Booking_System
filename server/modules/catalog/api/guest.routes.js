const express = require('express');
const { authenticate, optionalAuthenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const hotelSchema = require('./guest.schema');
const {
  getRecentlyViewedHotels,
  getTrendingHotels,
  getHotelDetails,
  searchRooms,
  getHotelPolicies,
  getNearbyPlaces,
  getHotelsByIds,
} = require('./hotel.controller');
const router = express.Router();
// Express 5 (path-to-regexp v8) no longer supports inline regex params such as
// `:hotelId([0-9a-fA-F-]{36})` — it throws at route registration. The UUID shape
// is enforced by the Joi schemas (`hotelIdSchema`) instead, which returns 400.
const HOTEL_ID_ROUTE_PARAM = ':hotelId';

// root route: /api/v1/hotels

router.get(
  '/recently-viewed',
  authenticate,
  validate(hotelSchema.getRecentlyViewedHotels),
  getRecentlyViewedHotels
);

router.post('/batch', optionalAuthenticate, validate(hotelSchema.getHotelsByIds), getHotelsByIds);

router.get(
  '/trending',
  optionalAuthenticate,
  validate(hotelSchema.getTrendingHotels),
  getTrendingHotels
);

router.get(
  `/${HOTEL_ID_ROUTE_PARAM}`,
  optionalAuthenticate,
  validate(hotelSchema.getHotelDetails),
  getHotelDetails
);

router.get(
  `/${HOTEL_ID_ROUTE_PARAM}/policies`,
  validate(hotelSchema.getHotelPolicies),
  getHotelPolicies
);

router.get(
  `/${HOTEL_ID_ROUTE_PARAM}/nearby-places`,
  validate(hotelSchema.getNearbyPlaces),
  getNearbyPlaces
);

router.get(`/${HOTEL_ID_ROUTE_PARAM}/rooms`, validate(hotelSchema.searchRooms), searchRooms);

module.exports = router;
