const express = require('express');

const {
  authenticate,
  requirePermission,
  requireEntityInHotel,
} = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');
const { Bookings } = require('@platform/database');

const schema = require('./schemas');
const controller = require('./admin.controller');

const router = express.Router();

// Bookings are always scoped to a hotel (platform staff may omit it for global views).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

// `/bookings/:bookingId*` has no hotelId in the path, so assert the booking
// belongs to the caller's hotel context (closes the cross-hotel IDOR).
const bookingInHotel = requireEntityInHotel(async (req) => {
  const booking = await Bookings.findOne({
    where: { id: req.params.bookingId },
    attributes: ['hotel_id'],
  });
  return booking?.hotel_id;
});

/**
 * Admin booking routes (mounted at /api/v1/admin/bookings).
 * Every route requires a bearer token and an explicit permission.
 */
router.use(authenticate);

router.get(
  '/',
  requireHotelPermission(PERMISSIONS.BOOKING_READ),
  validate(schema.listBookings),
  controller.listBookingsHandler
);

router.post(
  '/',
  requireHotelPermission(PERMISSIONS.BOOKING_CREATE),
  validate(schema.createBooking),
  controller.createBookingHandler
);

router.get(
  '/hotels/:hotelId/stats',
  requireHotelPermission(PERMISSIONS.BOOKING_READ),
  validate(schema.getBookingStats),
  controller.getBookingStatsHandler
);

router.get(
  '/hotels/:hotelId/trend',
  requireHotelPermission(PERMISSIONS.BOOKING_READ),
  validate(schema.getBookingTrend),
  controller.getBookingTrendHandler
);

router.get(
  '/hotels/:hotelId/calendar',
  requireHotelPermission(PERMISSIONS.BOOKING_READ),
  validate(schema.getReservationCalendar),
  controller.getReservationCalendarHandler
);

router.get(
  '/hotels/:hotelId/board',
  requireHotelPermission(PERMISSIONS.BOOKING_READ),
  validate(schema.getReservationBoard),
  controller.getReservationBoardHandler
);

router.get(
  '/:bookingId',
  requireHotelPermission(PERMISSIONS.BOOKING_READ),
  validate(schema.getBooking),
  bookingInHotel,
  controller.getBookingHandler
);

router.patch(
  '/:bookingId/status',
  requireHotelPermission(PERMISSIONS.BOOKING_MANAGE),
  validate(schema.updateBookingStatus),
  bookingInHotel,
  controller.updateBookingStatusHandler
);

router.post(
  '/:bookingId/cancel',
  requireHotelPermission(PERMISSIONS.BOOKING_CANCEL),
  validate(schema.cancelBooking),
  bookingInHotel,
  controller.cancelBookingHandler
);

module.exports = router;
