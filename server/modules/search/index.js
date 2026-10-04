const { searchHotels } = require('./application/searchHotels');
const { getHotelAvailability } = require('./application/getHotelAvailability');
const { recordRecentSearch, getRecentSearches } = require('./application/recentSearches');
const { getTrendingDestinations } = require('./application/getTrendingDestinations');
const {
  getAutocompleteSuggestions,
  getDestinationAutocomplete,
} = require('./application/autocomplete');
const { saveSearchLog } = require('./application/saveSearchLog');
const guestRoutes = require('./api/guest.routes');
const elasticsearchHelper = require('./infrastructure/elasticsearch.helper');

/**
 * Search module - public interface.
 *
 * Owns hotel search (hybrid Elasticsearch + MySQL), availability, autocomplete,
 * trending destinations and recent-search history. Other code must go through
 * here, never the application internals.
 *
 * Candidate extraction to a dedicated search service is a documented target;
 * this module is the seam that makes that move mechanical.
 */
module.exports = {
  guestRoutes,
  searchHotels,
  getHotelAvailability,
  recordRecentSearch,
  getRecentSearches,
  getTrendingDestinations,
  getAutocompleteSuggestions,
  getDestinationAutocomplete,
  saveSearchLog,

  // Elasticsearch access helper (exposed for the ES diagnostic script).
  elasticsearchHelper,
};
