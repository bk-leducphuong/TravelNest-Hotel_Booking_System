const express = require('express');

const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./superadmin.schema');
const controller = require('./superadmin.controller');

const router = express.Router();

/**
 * Superadmin routes (mounted at /api/v1/superadmin).
 *
 * Platform-wide, cross-tenant monitoring. Every route requires a bearer token
 * and an explicit `platform.*` permission. These routes are NOT hotel-scoped:
 * they never require `X-Hotel-Id` and never call `requirePermission` with
 * `requireHotelContext`.
 */
router.use(authenticate);

// Session bootstrap for the console UI. Any authenticated user may read their
// own session; the platform role check happens in the client middleware and on
// every data route below.
router.get('/me', controller.getMeHandler);

router.get(
  '/overview',
  requirePermission(PERMISSIONS.PLATFORM_OVERVIEW_READ),
  controller.getOverviewHandler
);

router.get(
  '/hotels',
  requirePermission(PERMISSIONS.PLATFORM_HOTEL_READ),
  validate(schema.listHotels),
  controller.listHotelsHandler
);

router.get(
  '/hotels/:hotelId',
  requirePermission(PERMISSIONS.PLATFORM_HOTEL_READ),
  validate(schema.hotelParams),
  controller.getHotelHandler
);

router.get(
  '/users',
  requirePermission(PERMISSIONS.PLATFORM_USER_READ),
  validate(schema.listUsers),
  controller.listUsersHandler
);

router.get(
  '/users/:userId',
  requirePermission(PERMISSIONS.PLATFORM_USER_READ),
  validate(schema.userParams),
  controller.getUserHandler
);

router.get(
  '/audit',
  requirePermission(PERMISSIONS.PLATFORM_AUDIT_READ),
  validate(schema.listAudit),
  controller.listAuditHandler
);

module.exports = router;
