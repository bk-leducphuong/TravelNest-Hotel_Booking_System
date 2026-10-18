const express = require('express');

const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./hotel-staff.schema');
const controller = require('./hotel-staff.controller');

const router = express.Router();

// Hotel-scoped: the caller must belong to the hotel (or be platform staff).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

/**
 * Hotel staff management (mounted at /api/v1/admin/hotels).
 * `GET` needs `hotel.read`; mutations need `hotel.manage_staff`.
 */
router.use(authenticate);

router.get(
  '/:hotelId/staff',
  requireHotelPermission(PERMISSIONS.HOTEL_READ),
  validate(schema.hotelStaffParams),
  controller.listHotelStaffHandler
);

router.post(
  '/:hotelId/staff',
  requireHotelPermission(PERMISSIONS.HOTEL_MANAGE_STAFF),
  validate(schema.addHotelStaff),
  controller.addHotelStaffHandler
);

router.patch(
  '/:hotelId/staff/:userId',
  requireHotelPermission(PERMISSIONS.HOTEL_MANAGE_STAFF),
  validate(schema.updateHotelStaff),
  controller.updateHotelStaffHandler
);

router.delete(
  '/:hotelId/staff/:userId',
  requireHotelPermission(PERMISSIONS.HOTEL_MANAGE_STAFF),
  validate(schema.hotelStaffMemberParams),
  controller.removeHotelStaffHandler
);

module.exports = router;
