const express = require('express');

const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./admin.schema');
const controller = require('./admin.controller');

const router = express.Router();

/**
 * Global location lookups for the admin property editor
 * (mounted at /api/v1/admin/locations).
 *
 * Cities and countries are platform-wide reference data — not hotel-scoped — so
 * these routes require `hotel.read` but no hotel context.
 */
router.use(authenticate);

router.get(
  '/cities',
  requirePermission(PERMISSIONS.HOTEL_READ),
  validate(schema.listCities),
  controller.listCitiesHandler
);

router.get(
  '/countries',
  requirePermission(PERMISSIONS.HOTEL_READ),
  validate(schema.listCountries),
  controller.listCountriesHandler
);

module.exports = router;
