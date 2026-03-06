const homeRepository = require('../repositories/home.repository');
const redisClient = require('../config/redis.config');
const ApiError = require('../utils/ApiError');

/**
 * Home Service - Contains main business logic
 * Follows RESTful API standards
 */

class HomeService {
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
}

module.exports = new HomeService();
