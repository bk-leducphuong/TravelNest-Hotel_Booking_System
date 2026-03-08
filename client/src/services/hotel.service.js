import http from './http';

export const HotelService = {
  /**
   * GET /v1/hotels/recently-viewed
   * Get recently viewed hotels for the authenticated user (requires auth).
   */
  getRecentlyViewed(limit = 10) {
    return http.get('/hotels/recently-viewed', { params: { limit } });
  },

  /**
   * GET /v1/hotels/trending
   * Get trending hotels based on view/booking activity (public).
   */
  getTrendingHotels(params = {}) {
    return http.get('/hotels/trending', { params });
  },

  getHotelDetails(hotelId, params = {}) {
    return http.get(`/hotels/${hotelId}`, { params });
  },

  searchAvailableRooms(hotelId, params) {
    return http.get(`/hotels/${hotelId}/rooms`, { params });
  },

  checkRoomAvailability(hotelId, params) {
    // The selectedRooms parameter might need to be stringified if it's an array of objects.
    // The backend seems to expect a JSON string or array of objects.
    // The http client should handle this correctly if `params.selectedRooms` is an array.
    if (params.selectedRooms && Array.isArray(params.selectedRooms)) {
      params.selectedRooms = JSON.stringify(params.selectedRooms);
    }
    return http.get(`/hotels/${hotelId}/rooms/availability`, {
      params,
    });
  },
};
