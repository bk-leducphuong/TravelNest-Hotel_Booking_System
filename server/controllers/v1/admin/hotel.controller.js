const adminHotelService = require('@services/admin/hotel.service');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Admin Hotel Controller - HTTP ↔ business logic mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/admin/hotels
 * Get all hotels owned by the authenticated admin
 */
const getAllHotels = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { page, limit } = req.query;

  const result = await adminHotelService.getAllHotels(ownerId, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.status(200).json({
    data: result.hotels,
    pagination: result.pagination,
  });
});

/**
 * GET /api/admin/hotels/:hotelId
 * Get a specific hotel by ID
 */
const getHotelById = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId } = req.params;

  const hotel = await adminHotelService.getHotelById(hotelId, ownerId);

  res.status(200).json({
    data: hotel,
  });
});

/**
 * PATCH /api/admin/hotels/:hotelId
 * Update hotel information
 */
const updateHotel = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId } = req.params;
  const updateData = req.body;

  const hotel = await adminHotelService.updateHotel(hotelId, ownerId, updateData);

  res.status(200).json({
    data: hotel,
    message: 'Hotel updated successfully',
  });
});

module.exports = {
  getAllHotels,
  getHotelById,
  updateHotel,
};
