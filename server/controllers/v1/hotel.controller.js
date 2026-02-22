const hotelService = require('@services/hotel.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Hotel Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/hotels/:hotelId
 * Get hotel details with rooms, reviews, nearby places, and review criteria
 */
const getHotelDetails = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const {
    checkInDate,
    checkOutDate,
    numberOfDays,
    numberOfRooms,
    numberOfGuests,
  } = req.query;

  const options = {
    checkInDate,
    checkOutDate,
    numberOfDays: numberOfDays ? parseInt(numberOfDays, 10) : undefined,
    numberOfRooms: numberOfRooms ? parseInt(numberOfRooms, 10) : undefined,
    numberOfGuests: numberOfGuests ? parseInt(numberOfGuests, 10) : undefined,
  };

  const result = await hotelService.getHotelDetails(hotelId, options);

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/hotels/:hotelId/rooms
 * Search available rooms for a hotel
 */
const searchRooms = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const {
    checkInDate,
    checkOutDate,
    numberOfDays,
    numberOfRooms,
    numberOfGuests,
    page,
    limit,
  } = req.query;

  const searchParams = {
    checkInDate,
    checkOutDate,
    numberOfDays: numberOfDays ? parseInt(numberOfDays, 10) : undefined,
    numberOfRooms: numberOfRooms ? parseInt(numberOfRooms, 10) : 1,
    numberOfGuests: numberOfGuests ? parseInt(numberOfGuests, 10) : undefined,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
  };

  const result = await hotelService.searchRooms(hotelId, searchParams);

  res.status(200).json({
    data: result.rooms,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  });
});

/**
 * GET /api/hotels/:hotelId/rooms/availability
 * Check room availability for specific rooms
 * Note: selectedRooms is validated and parsed by Joi schema
 */
const checkRoomAvailability = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const {
    checkInDate,
    checkOutDate,
    numberOfDays,
    numberOfGuests,
    selectedRooms,
  } = req.query;

  // selectedRooms is validated and transformed by Joi schema
  // It should already be an array, but handle string case for safety
  const parsedSelectedRooms = Array.isArray(selectedRooms)
    ? selectedRooms
    : typeof selectedRooms === 'string'
      ? JSON.parse(selectedRooms)
      : selectedRooms;

  const isAvailable = await hotelService.checkRoomAvailability(
    hotelId,
    parsedSelectedRooms,
    checkInDate,
    checkOutDate,
    parseInt(numberOfDays, 10),
    numberOfGuests ? parseInt(numberOfGuests, 10) : undefined
  );

  res.status(200).json({
    data: {
      isAvailable,
    },
  });
});

const getHotelPolicies = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const policies = await hotelService.getHotelPolicies(hotelId);
  res.status(200).json({ data: policies });
});

module.exports = {
  getHotelDetails,
  searchRooms,
  checkRoomAvailability,
  getHotelPolicies,
};
