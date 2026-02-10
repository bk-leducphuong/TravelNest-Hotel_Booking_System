const searchService = require('@services/search.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * GET /api/search
 * Search hotels by location and availability
 */
const searchHotels = asyncHandler(async (req, res) => {
  const {
    location,
    adults,
    children,
    checkInDate,
    checkOutDate,
    rooms,
    numberOfDays,
  } = req.query;

  const searchParams = {
    location,
    adults: adults ? parseInt(adults, 10) : undefined,
    children: children ? parseInt(children, 10) : undefined,
    checkInDate,
    checkOutDate,
    rooms: rooms ? parseInt(rooms, 10) : undefined,
    numberOfDays: numberOfDays ? parseInt(numberOfDays, 10) : undefined,
  };

  const hotels = await searchService.searchHotels(searchParams);

  res.status(200).json({
    data: hotels,
  });
});

/**
 * POST /api/search
 * Save search information to search logs
 */
const saveSearchInformation = asyncHandler(async (req, res) => {
  const userId = req.session.user?.user_id || null;
  const { searchData } = req.body;

  // Support both nested searchData and flat structure
  const searchParams = searchData || req.body;

  const searchLog = await searchService.saveSearchInformation(
    searchParams,
    userId
  );

  res.status(201).json({
    data: {
      message: 'Search log recorded successfully',
      searchLog,
    },
  });
});

module.exports = {
  searchHotels,
  saveSearchInformation,
};
