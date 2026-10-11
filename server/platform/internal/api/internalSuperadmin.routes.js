const express = require('express');

const asyncHandler = require('@utils/asyncHandler');
const {
  requireInternalSuperadmin,
  requireInternalSuperadminToken,
} = require('@middlewares/internal-superadmin.middleware');
const controller = require('./internalSuperadmin.controller');

const router = express.Router();

// Every route requires a valid caller: either the configured internal token or
// a Keycloak bearer token with the `admin` role.
router.use(requireInternalSuperadmin);

// --- Read-only / safe helpers (admin bearer allowed) -----------------------

router.get('/tasks', asyncHandler(controller.listTasks));

router.get('/notifications/test/targets', asyncHandler(controller.previewNotificationTargets));

router.post('/notifications/test/inapp', asyncHandler(controller.sendTestNotification));

router.post('/notifications/test/email', asyncHandler(controller.sendTestEmail));

// --- Destructive maintenance (internal token ONLY) -------------------------
//
// These mutate data or infrastructure, so an `admin` browser session must not
// be able to trigger them. They require the configured internal token.

router.post(
  '/database/init',
  requireInternalSuperadminToken,
  asyncHandler(controller.initDatabase)
);

router.post(
  '/database/seeders/:seeder',
  requireInternalSuperadminToken,
  asyncHandler(controller.runDatabaseSeeder)
);

router.post(
  '/images/seed',
  requireInternalSuperadminToken,
  asyncHandler(controller.runImageSeeder)
);

router.post(
  '/city-images/seed',
  requireInternalSuperadminToken,
  asyncHandler(controller.runCityImageSeeder)
);

router.post(
  '/elasticsearch/setup/:target',
  requireInternalSuperadminToken,
  asyncHandler(controller.setupElasticsearch)
);

router.post(
  '/elasticsearch/seeders/:target',
  requireInternalSuperadminToken,
  asyncHandler(controller.runElasticsearchSeeder)
);

router.post(
  '/mongodb/seeders/:target',
  requireInternalSuperadminToken,
  asyncHandler(controller.runMongodbSeeder)
);

module.exports = router;
