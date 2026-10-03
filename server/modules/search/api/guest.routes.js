const express = require('express');
const { authenticate, optionalAuthenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const searchSchema = require('@validators/v1/search.schema');
const {
  searchHotels,
  getHotelAvailability,
  getAutocompleteSuggestions,
  getDestinationAutocomplete,
  saveSearchInformation,
  getRecentSearches,
  getTrendingDestinations,
} = require('./search.controller');
const router = express.Router();

router.get('/hotels', optionalAuthenticate, validate(searchSchema.searchHotels), searchHotels);

router.get(
  '/hotels/:hotelId/availability',
  validate(searchSchema.getHotelAvailability),
  getHotelAvailability
);

router.get(
  '/autocomplete',
  validate(searchSchema.getAutocompleteSuggestions),
  getAutocompleteSuggestions
);

router.get(
  '/destinations/autocomplete',
  validate(searchSchema.getDestinationAutocomplete),
  getDestinationAutocomplete
);

router.post(
  '/log',
  optionalAuthenticate,
  validate(searchSchema.saveSearchInformation),
  saveSearchInformation
);

router.get('/recent', authenticate, validate(searchSchema.getRecentSearches), getRecentSearches);

router.get(
  '/destinations/trending',
  validate(searchSchema.getTrendingDestinations),
  getTrendingDestinations
);

module.exports = router;
