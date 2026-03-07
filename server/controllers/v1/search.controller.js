const searchService = require('@services/search.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * GET /api/v1/search/hotels
 * Search hotels with hybrid ES + DB architecture
 *
 * Query params:
 * - Location: city, country, latitude, longitude, radius
 * - Dates: checkIn, checkOut (ISO format, required)
 * - Guests: adults (required), children, rooms
 * - Filters: minPrice, maxPrice, minRating, hotelClass, amenities, freeCancellation
 * - Sorting: sortBy (relevance, price_asc, price_desc, rating, distance, popularity)
 * - Pagination: page, limit
 */
const searchHotels = asyncHandler(async (req, res) => {
  const searchParams = {
    // Location
    city: req.query.city,
    country: req.query.country,
    latitude: req.query.latitude ? parseFloat(req.query.latitude) : undefined,
    longitude: req.query.longitude ? parseFloat(req.query.longitude) : undefined,
    radius: req.query.radius ? parseFloat(req.query.radius) : undefined,

    // Dates (required)
    checkIn: req.query.checkIn || req.query.checkInDate,
    checkOut: req.query.checkOut || req.query.checkOutDate,

    // Guests (required)
    adults: req.query.adults ? parseInt(req.query.adults, 10) : undefined,
    children: req.query.children ? parseInt(req.query.children, 10) : undefined,
    rooms: req.query.rooms ? parseInt(req.query.rooms, 10) : undefined,

    // Filters
    minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
    minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
    hotelClass: req.query.hotelClass,
    amenities: req.query.amenities,
    freeCancellation: req.query.freeCancellation,

    // Sorting
    sortBy: req.query.sortBy || 'relevance',

    // Pagination
    page: req.query.page ? parseInt(req.query.page, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
  };

  const { destination, searchResults } = await searchService.searchHotels(searchParams);

  // Save search log asynchronously via BullMQ (don't wait)
  const userId = req.session?.user?.id || null;
  const analyticsData = {
    ...searchParams,
    destinationId: destination?.id,
    destination_type: destination?.type,
  };
  if (userId) {
    // 1) Store recent search in Redis
    searchService
      .recordRecentSearch(userId, searchParams)
      .catch((err) => logger.error({ err: err.message }, 'Failed to store recent search in Redis'));

    // 2) Queue analytics log via BullMQ
    searchService
      .saveSearchLog(analyticsData, userId, {
        resultCount: searchResults?.data?.pagination?.total || 0,
        searchTimeMs: searchResults?.data?.search_metadata?.search_time_ms || 0,
      })
      .catch((err) => {
        logger.error('Failed to queue search log:', err);
      });
  } else {
    // Anonymous users: analytics only, no per-user history
    searchService
      .saveSearchLog(analyticsData, null, {
        resultCount: searchResults?.data?.pagination?.total || 0,
        searchTimeMs: searchResults?.data?.search_metadata?.search_time_ms || 0,
      })
      .catch((err) => {
        logger.error('Failed to queue search log:', err);
      });
  }

  res.status(200).json(searchResults);
});

/**
 * GET /api/v1/search/hotels/:hotelId/availability
 * Check availability for a specific hotel
 *
 * Query params: checkIn, checkOut, adults, children, rooms
 */
const getHotelAvailability = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;

  const params = {
    checkIn: req.query.checkIn,
    checkOut: req.query.checkOut,
    adults: req.query.adults ? parseInt(req.query.adults, 10) : undefined,
    children: req.query.children ? parseInt(req.query.children, 10) : undefined,
    rooms: req.query.rooms ? parseInt(req.query.rooms, 10) : undefined,
  };

  const result = await searchService.getHotelAvailability(hotelId, params);

  res.status(200).json(result);
});

/**
 * GET /api/v1/search/autocomplete
 * Get autocomplete suggestions for hotel names
 *
 * Query params: query (required), limit
 */
const getAutocompleteSuggestions = asyncHandler(async (req, res) => {
  const { query, limit } = req.query;

  const result = await searchService.getAutocompleteSuggestions(
    query,
    limit ? parseInt(limit, 10) : 10
  );

  res.status(200).json(result);
});

/**
 * GET /api/v1/search/destinations/autocomplete
 * Get autocomplete suggestions for destinations (cities and countries)
 *
 * Query params: query (required), limit
 */
const getDestinationAutocomplete = asyncHandler(async (req, res) => {
  const { query, limit } = req.query;

  const result = await searchService.getDestinationAutocomplete(
    query,
    limit ? parseInt(limit, 10) : 10
  );

  res.status(200).json(result);
});

/**
 * POST /api/v1/search/log
 * Save search information to search logs (optional, for analytics)
 */
const saveSearchInformation = asyncHandler(async (req, res) => {
  const userId = req.session?.user?.id || null;
  const searchData = req.body;

  const result = await searchService.saveSearchLog(searchData, userId, req.body.metadata || {});

  res.status(201).json({
    success: true,
    data: {
      message: 'Search log queued for processing',
      jobId: result?.jobId,
    },
  });
});

/**
 * GET /api/v1/search/destinations/trending
 * Get top popular/trending destinations from ClickHouse (with Redis cache)
 */
const getTrendingDestinations = asyncHandler(async (req, res) => {
  const { limit, days } = req.query;

  const destinations = await searchService.getTrendingDestinations({
    limit: limit ? parseInt(limit, 10) : 5,
    days: days ? parseInt(days, 10) : 30,
  });

  res.status(200).json({
    success: true,
    data: {
      destinations,
    },
  });
});

/**
 * GET /api/v1/search/recent
 * Get recent hotel search queries for authenticated user (from Redis)
 */
const getRecentSearches = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  const { limit } = req.query;

  const searches = await searchService.getRecentSearches(userId, limit ? parseInt(limit, 10) : 10);

  res.status(200).json({
    success: true,
    data: {
      searches,
    },
  });
});

module.exports = {
  searchHotels,
  getHotelAvailability,
  getAutocompleteSuggestions,
  getDestinationAutocomplete,
  saveSearchInformation,
  getRecentSearches,
  getTrendingDestinations,
};
