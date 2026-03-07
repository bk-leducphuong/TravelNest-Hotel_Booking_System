const homeService = require('@services/home.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Home Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

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

module.exports = {
  getPopularPlaces,
  getNearbyHotels,
  getTopRatedHotels,
  getPopularDestinations,
};
