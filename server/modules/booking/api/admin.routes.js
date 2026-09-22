const express = require('express');

const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./schemas');
const controller = require('./admin.controller');

const router = express.Router();

// Bookings are always scoped to a hotel (platform staff may omit it for global views).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

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

router.get(
  '/hotels/:hotelId/stats',
  requireHotelPermission(PERMISSIONS.BOOKING_READ),
  validate(schema.getBookingStats),
  controller.getBookingStatsHandler
);

router.get(
  '/:bookingId',
  requireHotelPermission(PERMISSIONS.BOOKING_READ),
  validate(schema.getBooking),
  controller.getBookingHandler
);

router.patch(
  '/:bookingId/status',
  requireHotelPermission(PERMISSIONS.BOOKING_MANAGE),
  validate(schema.updateBookingStatus),
  controller.updateBookingStatusHandler
);

router.post(
  '/:bookingId/cancel',
  requireHotelPermission(PERMISSIONS.BOOKING_CANCEL),
  validate(schema.cancelBooking),
  controller.cancelBookingHandler
);

module.exports = router;
