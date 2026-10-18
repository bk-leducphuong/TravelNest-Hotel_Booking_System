const express = require('express');

const {
  authenticate,
  requirePermission,
  requirePlatformStaffOrHotels,
} = require('@middlewares/auth.middleware');
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
  // The admin catalog list must not be reachable by ordinary guests: allow
  // platform staff (global) or scope to the caller's hotels.
  requirePlatformStaffOrHotels,
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

router.get(
  '/:hotelId/policies',
  requireHotelPermission(PERMISSIONS.HOTEL_READ),
  validate(schema.hotelParams),
  controller.listPoliciesHandler
);

router.post(
  '/:hotelId/policies',
  requireHotelPermission(PERMISSIONS.HOTEL_UPDATE),
  validate(schema.createPolicy),
  controller.createPolicyHandler
);

router.patch(
  '/:hotelId/policies/:policyId',
  requireHotelPermission(PERMISSIONS.HOTEL_UPDATE),
  validate(schema.updatePolicy),
  controller.updatePolicyHandler
);

router.delete(
  '/:hotelId/policies/:policyId',
  requireHotelPermission(PERMISSIONS.HOTEL_UPDATE),
  validate(schema.policyParams),
  controller.deletePolicyHandler
);

// --- Amenities (assignment; the catalog lives at /admin/amenities) ---

router.get(
  '/:hotelId/amenities',
  requireHotelPermission(PERMISSIONS.HOTEL_READ),
  validate(schema.hotelParams),
  controller.getHotelAmenitiesHandler
);

router.put(
  '/:hotelId/amenities',
  requireHotelPermission(PERMISSIONS.HOTEL_UPDATE),
  validate(schema.setHotelAmenities),
  controller.setHotelAmenitiesHandler
);

router.get(
  '/:hotelId/rooms/:roomId/amenities',
  requireHotelPermission(PERMISSIONS.ROOM_READ),
  validate(schema.roomParams),
  controller.getRoomAmenitiesHandler
);

router.put(
  '/:hotelId/rooms/:roomId/amenities',
  requireHotelPermission(PERMISSIONS.ROOM_UPDATE),
  validate(schema.setRoomAmenities),
  controller.setRoomAmenitiesHandler
);

// --- Cancellation rules ---

router.get(
  '/:hotelId/cancellation-rules',
  requireHotelPermission(PERMISSIONS.HOTEL_READ),
  validate(schema.hotelParams),
  controller.listCancellationRulesHandler
);

router.post(
  '/:hotelId/cancellation-rules',
  requireHotelPermission(PERMISSIONS.HOTEL_UPDATE),
  validate(schema.createCancellationRule),
  controller.createCancellationRuleHandler
);

router.patch(
  '/:hotelId/cancellation-rules/:ruleId',
  requireHotelPermission(PERMISSIONS.HOTEL_UPDATE),
  validate(schema.updateCancellationRule),
  controller.updateCancellationRuleHandler
);

router.delete(
  '/:hotelId/cancellation-rules/:ruleId',
  requireHotelPermission(PERMISSIONS.HOTEL_UPDATE),
  validate(schema.cancellationRuleParams),
  controller.deleteCancellationRuleHandler
);

module.exports = router;
