const express = require('express');

const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./admin.schema');
const controller = require('./admin.controller');

const router = express.Router();

/**
 * Amenity catalog (mounted at /api/v1/admin/amenities).
 *
 * Shared reference data for the hotel/room amenity pickers. Requires
 * `hotel.read` and no hotel context (amenities are platform-wide).
 */
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.HOTEL_READ),
  validate(schema.listAmenities),
  controller.listAmenitiesHandler
);

module.exports = router;
