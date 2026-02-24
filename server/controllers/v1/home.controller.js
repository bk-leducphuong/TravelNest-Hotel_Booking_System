const homeService = require('@services/home.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Home Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/home/recent-viewed-hotels
 * Get recent viewed hotels (authenticated) or by hotel IDs (non-authenticated)
 */
const getRecentViewedHotels = asyncHandler(async (req, res) => {
  const userId = req.session.user?.user_id;
  const { hotelIds } = req.query;

  // Parse hotelIds if provided as query parameter
  let parsedHotelIds;
  if (hotelIds) {
    try {
      parsedHotelIds = typeof hotelIds === 'string' ? JSON.parse(hotelIds) : hotelIds;
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'hotelIds must be a valid JSON array',
        },
      });
    }
  }

  const hotels = await homeService.getRecentViewedHotels(userId, parsedHotelIds);

  res.status(200).json({
    data: hotels,
  });
});

/**
 * POST /api/home/recent-viewed-hotels
 * Record a hotel view for authenticated user
 */
const recordHotelView = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { hotelId } = req.body;

  await homeService.recordHotelView(userId, hotelId);

  res.status(201).json({
    data: {
      message: 'Hotel view recorded successfully',
    },
  });
});

/**
 * GET /api/home/recent-searches
 * Get recent searches for authenticated user
 */
const getRecentSearches = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { limit } = req.query;

  const searches = await homeService.getRecentSearches(userId, limit ? parseInt(limit, 10) : 10);

  res.status(200).json({
    data: searches,
  });
});

/**
 * DELETE /api/home/recent-searches/:searchId
 * Remove a recent search
 */
const removeRecentSearch = asyncHandler(async (req, res) => {
  const { searchId } = req.params;

  await homeService.removeRecentSearch(parseInt(searchId, 10));

  res.status(204).send();
});

/**
 * GET /api/home/popular-places
 * Get popular places (most searched locations)
 */
const getPopularPlaces = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const popularPlaces = await homeService.getPopularPlaces(limit ? parseInt(limit, 10) : 5);

  res.status(200).json({
    data: popularPlaces,
  });
});

/**
 * GET /api/home/nearby-hotels
 * Get nearby hotels based on coordinates
 */
const getNearbyHotels = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      error: {
        code: 'MISSING_COORDINATES',
        message: 'Latitude and longitude are required',
      },
    });
  }

  const hotels = await homeService.getNearbyHotels(
    parseFloat(latitude),
    parseFloat(longitude),
    radius ? parseFloat(radius) : 6
  );

  res.status(200).json({
    data: hotels,
  });
});

/**
 * GET /api/home/top-rated-hotels
 * Get top rated hotels
 */
const getTopRatedHotels = asyncHandler(async (req, res) => {
  const { limit, minRating, minReviews } = req.query;

  const hotels = await homeService.getTopRatedHotels(
    limit ? parseInt(limit, 10) : 10,
    minRating ? parseFloat(minRating) : 4,
    minReviews ? parseInt(minReviews, 10) : 5
  );

  res.status(200).json({
    data: hotels,
  });
});

/**
 * GET /api/home/recently-viewed-hotels
 * Get recently viewed hotels with full details (authenticated)
 */
const getRecentlyViewedHotels = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { limit } = req.query;

  const hotels = await homeService.getRecentlyViewedHotels(
    userId,
    limit ? parseInt(limit, 10) : 10
  );

  res.status(200).json({
    data: hotels,
  });
});

/**
 * GET /api/home/popular-destinations
 * Get popular destinations (cities)
 */
const getPopularDestinations = asyncHandler(async (req, res) => {
  const { limit, minHotels } = req.query;

  const destinations = await homeService.getPopularDestinations(
    limit ? parseInt(limit, 10) : 10,
    minHotels ? parseInt(minHotels, 10) : 5
  );

  res.status(200).json({
    data: destinations,
  });
});

/**
 * GET /api/home/trending-hotels
 * Get trending hotels
 */
const getTrendingHotels = asyncHandler(async (req, res) => {
  const { limit, days } = req.query;

  const hotels = await homeService.getTrendingHotels(
    limit ? parseInt(limit, 10) : 10,
    days ? parseInt(days, 10) : 30
  );

  res.status(200).json({
    data: hotels,
  });
});

module.exports = {
  getRecentViewedHotels,
  recordHotelView,
  getRecentSearches,
  removeRecentSearch,
  getPopularPlaces,
  getNearbyHotels,
  getTopRatedHotels,
  getRecentlyViewedHotels,
  getPopularDestinations,
  getTrendingHotels,
};
