const express = require('express');

const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./admin.schema');
const controller = require('./admin.controller');

const router = express.Router();

// Property routes are scoped to a hotel (platform staff may act on any hotel).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

/**
 * Admin catalog routes (mounted at /api/v1/admin/hotels).
 * Every route requires a bearer token and an explicit permission.
 */
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.HOTEL_READ),
  validate(schema.listHotels),
  controller.listHotelsHandler
);

router.get(
  '/:hotelId',
  requireHotelPermission(PERMISSIONS.HOTEL_READ),
  validate(schema.hotelParams),
  controller.getHotelHandler
);

router.patch(
  '/:hotelId',
  requireHotelPermission(PERMISSIONS.HOTEL_UPDATE),
  validate(schema.updateHotel),
  controller.updateHotelHandler
);

router.get(
  '/:hotelId/rooms',
  requireHotelPermission(PERMISSIONS.ROOM_READ),
  validate(schema.hotelParams),
  controller.listRoomsHandler
);

router.post(
  '/:hotelId/rooms',
  requireHotelPermission(PERMISSIONS.ROOM_CREATE),
  validate(schema.createRoom),
  controller.createRoomHandler
);

router.patch(
  '/:hotelId/rooms/:roomId',
  requireHotelPermission(PERMISSIONS.ROOM_UPDATE),
  validate(schema.updateRoom),
  controller.updateRoomHandler
);

router.delete(
  '/:hotelId/rooms/:roomId',
  requireHotelPermission(PERMISSIONS.ROOM_DELETE),
  validate(schema.roomParams),
  controller.deleteRoomHandler
);

module.exports = router;
