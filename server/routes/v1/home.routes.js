const express = require('express');
const {
  getRecentViewedHotels,
  recordHotelView,
  getRecentSearches,
  removeRecentSearch,
  getPopularPlaces,
  getNearbyHotels,
  getTopRatedHotels,
  getPopularDestinations,
} = require('@controllers/v1/home.controller.js');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const homeSchema = require('@validators/v1/home.schema');
const router = express.Router();

/**
 * GET /api/home/popular-places
 * Get popular places (public)
 */
router.get('/popular-places', validate(homeSchema.getPopularPlaces), getPopularPlaces);

/**
 * GET /api/home/nearby-hotels
 * Get nearby hotels based on coordinates (public)
 */
router.get('/nearby-hotels', validate(homeSchema.getNearbyHotels), getNearbyHotels);

/**
 * GET /api/home/top-rated-hotels
 * Get top rated hotels (public)
 */
router.get('/top-rated-hotels', validate(homeSchema.getTopRatedHotels), getTopRatedHotels);

/**
 * GET /api/home/popular-destinations
 * Get popular destinations (public)
 */
router.get(
  '/popular-destinations',
  validate(homeSchema.getPopularDestinations),
  getPopularDestinations
);

module.exports = router;
