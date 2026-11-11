const express = require('express');

const { requireInternalSuperadmin } = require('@middlewares/internal-superadmin.middleware');
const controller = require('./internalSuperadmin.controller');

const router = express.Router();

// Auth is enforced for the whole router: either a configured internal token or
// a Keycloak bearer token with the admin role.
router.use(requireInternalSuperadmin);

router.get(
  '/notifications/test/targets',
  // requireInternalSuperadmin,
  controller.previewNotificationTargets
);

router.post(
  '/notifications/test/inapp',
  // requireInternalSuperadmin,
  controller.sendTestNotification
);

router.post(
  '/notifications/test/email',
  // requireInternalSuperadmin,
  controller.sendTestEmail
);

router.get('/tasks', controller.listTasks);

router.post('/database/init', controller.initDatabase);

router.post('/database/seeders/:seeder', controller.runDatabaseSeeder);

router.post('/images/seed', controller.runImageSeeder);

router.post('/city-images/seed', controller.runCityImageSeeder);

router.post('/mongodb/seeders/:target', controller.runMongodbSeeder);

module.exports = router;
