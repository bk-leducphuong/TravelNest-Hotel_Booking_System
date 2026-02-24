const homeRepository = require('../repositories/home.repository');
const redisClient = require('../config/redis.config');
const ApiError = require('../utils/ApiError');

/**
 * Home Service - Contains main business logic
 * Follows RESTful API standards
 */

class HomeService {
  /**
   * Get recent viewed hotels for user or by hotel IDs
   * @param {number} userId - User ID (optional)
   * @param {Array<number>} hotelIds - Hotel IDs array (optional, for non-authenticated users)
   * @returns {Promise<Array>} Array of hotel information
   */
  async getRecentViewedHotels(userId, hotelIds) {
    let hotelIdArray = [];

    if (userId) {
      // Get from user's viewed hotels
      const viewedHotels = await homeRepository.findViewedHotelsByUserId(userId, 10);

      if (viewedHotels.length === 0) {
        return [];
      }

      hotelIdArray = viewedHotels.map((view) => view.hotel_id);
    } else if (hotelIds && hotelIds.length > 0) {
      // Use provided hotel IDs (for non-authenticated users)
      hotelIdArray = hotelIds;
    } else {
      return [];
    }

    // Get hotel information
    const hotels = await homeRepository.findHotelsByIds(hotelIdArray);
    return hotels.map((hotel) => (hotel.toJSON ? hotel.toJSON() : hotel));
  }

  /**
   * Record a hotel view for a user
   * @param {number} userId - User ID
   * @param {number} hotelId - Hotel ID
   * @returns {Promise<void>}
   */
  async recordHotelView(userId, hotelId) {
    // Delete existing view if exists (to update timestamp)
    await homeRepository.deleteViewedHotel(userId, hotelId);

    // Count existing views
    const count = await homeRepository.countViewedHotelsByUserId(userId);

    // If count >= 10, delete oldest view
    if (count >= 10) {
      await homeRepository.deleteOldestViewedHotel(userId);
    }

    // Create new view
    await homeRepository.createViewedHotel(userId, hotelId);
  }

  /**
   * Get recent searches for a user
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of search logs
   */
  async getRecentSearches(userId, limit = 10) {
    const searches = await homeRepository.findSearchLogsByUserId(userId, limit);
    return searches.map((search) => (search.toJSON ? search.toJSON() : search));
  }

  /**
   * Remove a recent search
   * @param {number} searchId - Search ID
   * @returns {Promise<void>}
   */
  async removeRecentSearch(searchId) {
    const deleted = await homeRepository.deleteSearchLogById(searchId);
    if (deleted === 0) {
      throw new ApiError(404, 'SEARCH_NOT_FOUND', 'Search not found');
    }
  }

  /**
   * Get popular places (most searched locations)
   * Uses Redis cache with 24 hour TTL
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of popular places
   */
  async getPopularPlaces(limit = 5) {
    // Check Redis cache
    const cacheKey = 'popular_places';
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // If cache miss, query the database
    const results = await homeRepository.findPopularPlaces(limit);

    if (results.length === 0) {
      return [];
    }

    const popularPlaces = results.map((result) => ({
      location: result.location,
      search_count: parseInt(result.get('search_count'), 10) || 0,
    }));

    // Store in Redis with 24 hour TTL
    await redisClient.set(cacheKey, JSON.stringify(popularPlaces), {
      EX: 60 * 60 * 24,
    });

    return popularPlaces;
  }

  /**
   * Get nearby hotels based on coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} radiusKm - Search radius in kilometers (default: 6)
   * @returns {Promise<Array>} Array of nearby hotels
   */
  async getNearbyHotels(latitude, longitude, radiusKm = 6) {
    if (!latitude || !longitude) {
      throw new ApiError(400, 'MISSING_COORDINATES', 'Latitude and longitude are required');
    }

    const hotels = await homeRepository.findNearbyHotels(latitude, longitude, radiusKm);

    return hotels.map((hotel) => {
      const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;
      return {
        ...hotelData,
        distance: parseFloat(hotelData.distance || 0),
      };
    });
  }

  /**
   * Get top rated hotels
   * @param {number} limit - Maximum number of results
   * @param {number} minRating - Minimum rating (default: 4)
   * @param {number} minReviews - Minimum number of reviews (default: 5)
   * @returns {Promise<Array>} Array of top rated hotels
   */
  async getTopRatedHotels(limit = 10, minRating = 4, minReviews = 5) {
    const hotels = await homeRepository.findTopRatedHotels(limit, minRating, minReviews);

    return hotels.map((hotel) => {
      const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;
      return {
        ...hotelData,
        review_count: parseInt(hotelData.review_count || 0, 10),
      };
    });
  }

  /**
   * Get recently viewed hotels with full details
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of hotel details
   */
  async getRecentlyViewedHotels(userId, limit = 10) {
    const viewedHotels = await homeRepository.findRecentlyViewedHotelsWithDetails(userId, limit);

    return viewedHotels
      .map((view) => {
        const hotel = view.hotels || view.Hotel;
        return hotel ? (hotel.toJSON ? hotel.toJSON() : hotel) : null;
      })
      .filter(Boolean);
  }

  /**
   * Get popular destinations (cities)
   * @param {number} limit - Maximum number of results
   * @param {number} minHotels - Minimum hotels per city (default: 5)
   * @returns {Promise<Array>} Array of popular destinations
   */
  async getPopularDestinations(limit = 10, minHotels = 5) {
    const destinations = await homeRepository.findPopularDestinations(limit, minHotels);

    return destinations.map((dest) => {
      const destData = dest.toJSON ? dest.toJSON() : dest;
      return {
        city: destData.city,
        hotel_count: parseInt(destData.hotel_count || 0, 10),
        avg_rating: parseFloat(destData.avg_rating || 0),
      };
    });
  }

  /**
   * Get trending hotels
   * @param {number} limit - Maximum number of results
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Promise<Array>} Array of trending hotels
   */
  async getTrendingHotels(limit = 10, days = 30) {
    const hotels = await homeRepository.findTrendingHotels(limit, days);

    return hotels.map((hotel) => {
      const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;
      return {
        ...hotelData,
        view_count: parseInt(hotelData.view_count || 0, 10),
        booking_count: parseInt(hotelData.booking_count || 0, 10),
      };
    });
  }
}

module.exports = new HomeService();
