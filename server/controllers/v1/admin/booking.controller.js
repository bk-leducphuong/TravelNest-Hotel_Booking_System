const adminBookingService = require('@services/admin/booking.service');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Admin Booking Controller - HTTP ↔ business logic mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/admin/bookings
 * Get all bookings for a specific hotel
 */
const getAllBookings = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, status, page, limit } = req.query;

  const result = await adminBookingService.getAllBookings(hotelId, ownerId, {
    status,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.status(200).json({
    data: result.bookings,
    pagination: result.pagination,
  });
});

/**
 * GET /api/admin/bookings/:bookingId
 * Get a specific booking by ID
 */
const getBookingById = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { bookingId } = req.params;

  const booking = await adminBookingService.getBookingById(bookingId, ownerId);

  res.status(200).json({
    data: booking,
  });
});

/**
 * GET /api/admin/bookings/:bookingId/booker
 * Get booker information for a specific booking
 */
const getBookerInformation = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { bookingId } = req.params;

  const booker = await adminBookingService.getBookerInformation(bookingId, ownerId);

  res.status(200).json({
    data: booker,
  });
});

/**
 * PATCH /api/admin/bookings/:bookingId/status
 * Update booking status
 */
const updateBookingStatus = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { bookingId } = req.params;
  const { status } = req.body;

  const booking = await adminBookingService.updateBookingStatus(bookingId, ownerId, status);

  res.status(200).json({
    data: booking,
    message: 'Booking status updated successfully',
  });
});

module.exports = {
  getAllBookings,
  getBookingById,
  getBookerInformation,
  updateBookingStatus,
};
