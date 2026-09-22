const express = require('express');

const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./schemas');
const controller = require('./admin.controller');

const router = express.Router();

// Inventory is always scoped to a hotel (platform staff may omit it for global views).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

/**
 * Admin inventory routes (mounted at /api/v1/admin/inventory).
 * Every route requires a bearer token and an explicit permission.
 */
router.use(authenticate);

router.get(
  '/hotels/:hotelId/rooms',
  requireHotelPermission(PERMISSIONS.ROOM_READ),
  validate(schema.getHotelRooms),
  controller.listRoomsHandler
);

router.get(
  '/hotels/:hotelId/occupancy',
  requireHotelPermission(PERMISSIONS.ROOM_READ),
  validate(schema.getHotelOccupancy),
  controller.getHotelOccupancyHandler
);

router.get(
  '/rooms/:roomId',
  requireHotelPermission(PERMISSIONS.ROOM_READ),
  validate(schema.getRoomInventory),
  controller.getRoomInventoryHandler
);

router.patch(
  '/rooms/:roomId',
  requireHotelPermission(PERMISSIONS.ROOM_MANAGE_INVENTORY),
  validate(schema.updateRoomInventory),
  controller.updateRoomInventoryHandler
);

module.exports = router;
