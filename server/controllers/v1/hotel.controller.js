const hotelService = require('@services/hotel.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');
const { computeNumberOfNights } = require('@helpers/hotel.helpers');

/**
 * GET /api/hotels/:hotelId
 * Get hotel details with rooms, reviews, nearby places, and review criteria
 */
const getHotelDetails = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { checkInDate, checkOutDate, numberOfRooms, numberOfGuests } =
    req.query;

  const numberOfNights = computeNumberOfNights(checkInDate, checkOutDate);

  const options = {
    checkInDate,
    checkOutDate,
    numberOfNights,
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
    numberOfRooms,
    numberOfGuests,
    page,
    limit,
  } = req.query;

  const numberOfNights = computeNumberOfNights(checkInDate, checkOutDate);

  const searchParams = {
    checkInDate,
    checkOutDate,
    numberOfNights,
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

const getHotelPolicies = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const policies = await hotelService.getHotelPolicies(hotelId);
  res.status(200).json({ data: policies });
});

/**
 * GET /api/hotels/:hotelId/nearby-places
 * Get nearby places for a hotel
 */
const getNearbyPlaces = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { category, limit } = req.query;

  const places = await hotelService.getNearbyPlaces(hotelId, {
    category,
    limit: limit ? parseInt(limit, 10) : 20,
  });

  res.status(200).json({ data: places });
});

module.exports = {
  getHotelDetails,
  searchRooms,
  getHotelPolicies,
  getNearbyPlaces,
};
