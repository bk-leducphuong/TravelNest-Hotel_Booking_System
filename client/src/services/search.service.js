import http from './http';

export const SearchService = {
  /**
   * GET /api/v1/search/hotels
   * Search hotels with hybrid ES + DB architecture.
   */
  searchHotels(params) {
    return http.get('/search/hotels', { params });
  },

  searchMapHotels(params, signal) {
    return http.get('/search/hotels/map', { params, signal });
  },

  /**
   * GET /api/v1/search/geo/ip
   * City-level approximate location for the calling network, when the edge
   * provides it. Never returns the raw IP.
   */
  getIpLocation() {
    return http.get('/search/geo/ip');
  },

  getHotelAvailability(hotelId, params = {}) {
    return http.get(`/search/hotels/${hotelId}/availability`, { params });
  },

  /**
   * GET /api/v1/search/deals
   * Public home-page deals feed. Dates are optional; the server uses a sample
   * stay (tomorrow + 2 nights) when omitted.
   */
  getHotelDeals(params = {}) {
    return http.get('/search/deals', { params });
  },

  getAutocompleteSuggestions(query, limit = 10) {
    return http.get('/search/autocomplete', {
      params: { query, limit },
    });
  },

  saveSearch(searchData) {
    return http.post('/search/log', {
      city: searchData.city ?? searchData.location,
      checkIn: searchData.checkIn ?? searchData.checkInDate,
      checkOut: searchData.checkOut ?? searchData.checkOutDate,
      adults: parseInt(searchData.adults, 10) || 1,
      children: parseInt(searchData.children, 10) || 0,
      rooms: parseInt(searchData.rooms, 10) || 1,
      nights: parseInt(searchData.nights ?? searchData.numberOfDays, 10) || undefined,
      latitude: searchData.latitude,
      longitude: searchData.longitude,
      radius: searchData.radius,
      locationSource: searchData.locationSource,
    });
  },

  /**
   * GET /v1/search/recent
   * Get recent hotel searches for the authenticated user (requires auth).
   */
  getRecentSearches(limit = 10) {
    return http.get('/search/recent', { params: { limit } });
  },

  /**
   * GET /api/v1/search/destinations/trending
   * Get trending destinations (cities) based on booking/search data.
   */
  getTrendingDestinations(params = {}) {
    return http.get('/search/destinations/trending', { params });
  },

  /**
   * GET /api/v1/search/destinations/autocomplete
   * Get destination autocomplete suggestions (cities and countries).
   */
  getDestinationAutocomplete(query, limit = 10) {
    return http.get('/search/destinations/autocomplete', {
      params: { query, limit },
    });
  },
};
