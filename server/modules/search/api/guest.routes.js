const express = require('express');
const { authenticate, optionalAuthenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const searchSchema = require('./guest.schema');
const {
  searchHotels,
  searchMapHotels,
  getIpLocation,
  getHotelAvailability,
  getHotelDeals,
  getAutocompleteSuggestions,
  getDestinationAutocomplete,
  saveSearchInformation,
  getRecentSearches,
  getTrendingDestinations,
} = require('./search.controller');
const router = express.Router();

router.get(
  '/hotels/map',
  optionalAuthenticate,
  validate(searchSchema.searchMapHotels),
  searchMapHotels
);

router.get('/geo/ip', getIpLocation);

router.get('/hotels', optionalAuthenticate, validate(searchSchema.searchHotels), searchHotels);

router.get('/deals', optionalAuthenticate, validate(searchSchema.getHotelDeals), getHotelDeals);

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
