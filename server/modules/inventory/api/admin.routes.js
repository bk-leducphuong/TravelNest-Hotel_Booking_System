const express = require('express');

const {
  authenticate,
  requirePermission,
  requireEntityInHotel,
} = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');
const { Rooms } = require('@platform/database');

const schema = require('./schemas');
const controller = require('./admin.controller');

const router = express.Router();

// Inventory is always scoped to a hotel (platform staff may omit it for global views).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

// `/rooms/:roomId` has no hotelId in the path, so assert the room belongs to
// the caller's hotel context (closes the cross-hotel IDOR).
const roomInHotel = requireEntityInHotel(async (req) => {
  const room = await Rooms.findOne({
    where: { id: req.params.roomId },
    attributes: ['hotel_id'],
  });
  return room?.hotel_id;
});

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
  roomInHotel,
  controller.getRoomInventoryHandler
);

router.patch(
  '/rooms/:roomId',
  requireHotelPermission(PERMISSIONS.ROOM_MANAGE_INVENTORY),
  validate(schema.updateRoomInventory),
  roomInHotel,
  controller.updateRoomInventoryHandler
);

module.exports = router;
