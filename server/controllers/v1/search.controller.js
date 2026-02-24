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

  const result = await searchService.searchHotels(searchParams);

  // Save search log asynchronously via BullMQ (don't wait)
  const userId = req.session?.user?.user_id || null;
  searchService
    .saveSearchLog(searchParams, userId, {
      resultCount: result.data?.pagination?.total || 0,
      searchTimeMs: result.data?.search_metadata?.search_time_ms || 0,
    })
    .catch((err) => {
      logger.error('Failed to queue search log:', err);
    });

  res.status(200).json(result);
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
 * POST /api/v1/search/log
 * Save search information to search logs (optional, for analytics)
 */
const saveSearchInformation = asyncHandler(async (req, res) => {
  const userId = req.session?.user?.user_id || null;
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

module.exports = {
  searchHotels,
  getHotelAvailability,
  getAutocompleteSuggestions,
  saveSearchInformation,
};
