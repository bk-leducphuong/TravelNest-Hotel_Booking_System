const express = require('express');
const { authenticate, optionalAuthenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const hotelSchema = require('@validators/v1/hotel.schema');
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
const HOTEL_ID_ROUTE_PARAM = ':hotelId([0-9a-fA-F-]{36})';

// root route: /api/v1/hotels

router.get(
  '/recently-viewed',
  authenticate,
  validate(hotelSchema.getRecentlyViewedHotels),
  getRecentlyViewedHotels
);

router.post('/batch', getHotelsByIds);

router.get('/trending', validate(hotelSchema.getTrendingHotels), getTrendingHotels);

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
