const express = require('express');
const {
  getHotelDetails,
  searchRooms,
  checkRoomAvailability,
  getHotelPolicies,
} = require('@controllers/v1/hotel.controller.js');
const validate = require('@middlewares/validate.middleware');
const hotelSchema = require('@validators/v1/hotel.schema');
const router = express.Router();

// root route: /api/hotels

/**
 * GET /api/hotels/:hotelId
 * Get hotel details with optional search parameters
 * Query params: checkInDate, checkOutDate, numberOfDays, numberOfRooms, numberOfGuests
 */
router.get('/:hotelId', validate(hotelSchema.getHotelDetails), getHotelDetails);

/**
 * GET /api/hotels/:hotelId/policies
 * Get all policies for a hotel
 */
router.get(
  '/:hotelId/policies',
  validate(hotelSchema.getHotelPolicies),
  getHotelPolicies
);

/**
 * GET /api/hotels/:hotelId/rooms
 * Search available rooms for a hotel
 * Query params: checkInDate, checkOutDate, numberOfDays, numberOfRooms, numberOfGuests, page, limit
 */
router.get('/:hotelId/rooms', validate(hotelSchema.searchRooms), searchRooms);

/**
 * GET /api/hotels/:hotelId/rooms/availability
 * Check room availability for specific rooms
 * Query params: checkInDate, checkOutDate, numberOfDays, numberOfGuests, selectedRooms (JSON array)
 */
router.get(
  '/:hotelId/rooms/availability',
  validate(hotelSchema.checkRoomAvailability),
  checkRoomAvailability
);

module.exports = router;
