import http from './http';

export const SearchService = {
  /**
   * GET /api/v1/search/hotels
   * Search hotels with hybrid ES + DB architecture.
   */
  searchHotels(params) {
    return http.get('/search/hotels', { params });
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
