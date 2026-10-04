const express = require('express');

const asyncHandler = require('@utils/asyncHandler');
const { requireInternalSuperadmin } = require('@middlewares/internal-superadmin.middleware');
const controller = require('./internalSuperadmin.controller');

const router = express.Router();

// Auth is enforced for the whole router: either a configured internal token or
// a Keycloak bearer token with the admin role.
router.use(requireInternalSuperadmin);

router.get(
  '/notifications/test/targets',
  // requireInternalSuperadmin,
  asyncHandler(controller.previewNotificationTargets)
);

router.post(
  '/notifications/test/inapp',
  // requireInternalSuperadmin,
  asyncHandler(controller.sendTestNotification)
);

router.post(
  '/notifications/test/email',
  // requireInternalSuperadmin,
  asyncHandler(controller.sendTestEmail)
);

router.get('/tasks', asyncHandler(controller.listTasks));

router.post('/database/init', asyncHandler(controller.initDatabase));

router.post('/database/seeders/:seeder', asyncHandler(controller.runDatabaseSeeder));

router.post('/images/seed', asyncHandler(controller.runImageSeeder));

router.post('/city-images/seed', asyncHandler(controller.runCityImageSeeder));

router.post('/elasticsearch/setup/:target', asyncHandler(controller.setupElasticsearch));

router.post('/elasticsearch/seeders/:target', asyncHandler(controller.runElasticsearchSeeder));

router.post('/mongodb/seeders/:target', asyncHandler(controller.runMongodbSeeder));

module.exports = router;
