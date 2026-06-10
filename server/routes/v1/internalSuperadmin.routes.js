const express = require('express');

const asyncHandler = require('@utils/asyncHandler');
const controller = require('@controllers/v1/internalSuperadmin.controller');
const { requireInternalSuperadmin } = require('@middlewares/internal-superadmin.middleware');

const router = express.Router();

// router.use(requireInternalSuperadmin);

/**
 * @swagger
 * /internal/superadmin/notifications/test/targets:
 *   get:
 *     summary: Preview notification test recipients
 *     description: Resolves a filtered set of active users that would receive a test notification or email, without publishing any events.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: userIds
 *         required: false
 *         schema:
 *           oneOf:
 *             - type: array
 *               items:
 *                 type: string
 *                 format: uuid
 *             - type: string
 *         description: One or more user IDs to target.
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum: [guest, user, admin, support_agent, owner, manager, staff]
 *         description: Restrict recipients to users with the specified role.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of users to preview.
 *       - in: query
 *         name: requireEmail
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Only include users with a non-empty email address.
 *     responses:
 *       200:
 *         description: Matching recipients previewed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NotificationTestTargetPreview'
 *       400:
 *         description: No valid target selector was provided.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Superadmin authentication required.
 *       403:
 *         description: Superadmin access required.
 */
router.get(
  '/notifications/test/targets',
  // requireInternalSuperadmin,
  asyncHandler(controller.previewNotificationTargets)
);
/**
 * @swagger
 * /internal/superadmin/notifications/test/inapp:
 *   post:
 *     summary: Queue a bulk test in-app notification
 *     description: Publishes a test notification event to the Go notification service for a filtered set of active users.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InAppNotificationTestRequest'
 *           examples:
 *             byRole:
 *               summary: Send to recent active users with the user role
 *               value:
 *                 role: user
 *                 limit: 10
 *                 title: Notification workflow test
 *                 message: This is a test in-app notification from the internal admin API.
 *                 category: system
 *                 priority: normal
 *             byUsers:
 *               summary: Send to specific users
 *               value:
 *                 userIds:
 *                   - 018f5f6c-8c1a-7b9a-9c7a-a3b2f3d5e6f7
 *                   - 018f5f6c-8c1a-7b9a-9c7a-a3b2f3d5e6f8
 *                 title: Notification workflow test
 *                 message: This is a targeted test.
 *                 actionUrl: /notifications
 *                 actionLabel: Open notifications
 *     responses:
 *       200:
 *         description: Test notification event queued successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NotificationTestDispatchResult'
 *       400:
 *         description: Invalid payload or target selector.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Superadmin authentication required.
 *       403:
 *         description: Superadmin access required.
 *       503:
 *         description: NATS publish failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/notifications/test/inapp',
  // requireInternalSuperadmin,
  asyncHandler(controller.sendTestNotification)
);
/**
 * @swagger
 * /internal/superadmin/notifications/test/email:
 *   post:
 *     summary: Queue bulk test emails
 *     description: Publishes one test email event per matched active user with an email address.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailNotificationTestRequest'
 *           examples:
 *             byRole:
 *               summary: Send to owners
 *               value:
 *                 role: owner
 *                 limit: 5
 *                 subject: Email workflow test
 *                 message: This is a test email from the internal admin API.
 *             byUsers:
 *               summary: Send to specific users
 *               value:
 *                 userIds:
 *                   - 018f5f6c-8c1a-7b9a-9c7a-a3b2f3d5e6f7
 *                 subject: Email workflow test
 *                 message: Please ignore this message. It was sent for pipeline verification.
 *     responses:
 *       200:
 *         description: Test email events queued successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/EmailNotificationTestDispatchResult'
 *       400:
 *         description: Invalid payload or target selector.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Superadmin authentication required.
 *       403:
 *         description: Superadmin access required.
 *       503:
 *         description: NATS publish failed for all targets.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/notifications/test/email',
  // requireInternalSuperadmin,
  asyncHandler(controller.sendTestEmail)
);

/**
 * @swagger
 * components:
 *   schemas:
 *     InternalTaskResult:
 *       type: object
 *       properties:
 *         task:
 *           type: string
 *           example: database:seed:all
 *         script:
 *           type: string
 *           example: seeders/database/seed-all.js
 *         args:
 *           type: array
 *           items:
 *             type: string
 *           example: ["--quick", "--skip-images"]
 *         exitCode:
 *           type: integer
 *           nullable: true
 *           example: 0
 *         signal:
 *           type: string
 *           nullable: true
 *           example: null
 *         startedAt:
 *           type: string
 *           format: date-time
 *         finishedAt:
 *           type: string
 *           format: date-time
 *         durationMs:
 *           type: integer
 *           example: 12400
 *         stdout:
 *           type: string
 *           description: Last 20,000 characters of task stdout.
 *         stderr:
 *           type: string
 *           description: Last 20,000 characters of task stderr.
 *     InternalTaskOptions:
 *       type: object
 *       properties:
 *         timeoutMs:
 *           type: integer
 *           minimum: 1
 *           example: 1800000
 *           description: Optional task timeout in milliseconds. Defaults to 30 minutes.
 *     DatabaseSeederOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/InternalTaskOptions'
 *         - type: object
 *           properties:
 *             clear:
 *               type: boolean
 *               example: false
 *               description: Passes --clear to supported seeders.
 *             clearExisting:
 *               type: boolean
 *               example: false
 *               description: Alias for clear.
 *             quick:
 *               type: boolean
 *               example: true
 *               description: Only applies to the all seeder.
 *             skipImages:
 *               type: boolean
 *               example: true
 *               description: Only applies to the all seeder.
 *             skipSnapshots:
 *               type: boolean
 *               example: false
 *               description: Only applies to the all seeder.
 *             rebuild:
 *               type: boolean
 *               example: true
 *               description: Only applies to hotel_search_snapshot.
 *     ImageSeederOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/InternalTaskOptions'
 *         - type: object
 *           properties:
 *             skipChecks:
 *               type: boolean
 *               example: false
 *               description: Passes --skip-checks to skip image directory, API health, and database prerequisite checks.
 *             skipPrerequisites:
 *               type: boolean
 *               example: false
 *               description: Alias for skipChecks.
 *             hotelsOnly:
 *               type: boolean
 *               example: true
 *               description: Passes --hotels-only to seed hotel images only.
 *             roomsOnly:
 *               type: boolean
 *               example: false
 *               description: Passes --rooms-only to seed room images only.
 *             limit:
 *               type: integer
 *               minimum: 1
 *               example: 10
 *               description: Passes --limit=N to limit entities processed per type.
 *             apiBaseUrl:
 *               type: string
 *               format: uri
 *               example: http://localhost:3000/api/v1
 *               description: Overrides API_BASE_URL for the image seeder child process.
 *             healthCheckUrl:
 *               type: string
 *               format: uri
 *               example: http://localhost:3000/health/live
 *               description: Overrides HEALTH_CHECK_URL for the image seeder child process.
 *     CityImageSeederOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/InternalTaskOptions'
 *         - type: object
 *           properties:
 *             primaryOnly:
 *               type: boolean
 *               example: true
 *               description: Upload one primary image per city. Defaults to true.
 *             allImages:
 *               type: boolean
 *               example: false
 *               description: Passes --all-images to upload every city image for each city. Equivalent to primaryOnly=false.
 *             limit:
 *               type: integer
 *               minimum: 1
 *               example: 10
 *               description: Passes --limit=N to limit the number of cities processed.
 *             apiBaseUrl:
 *               type: string
 *               format: uri
 *               example: http://localhost:3000/api/v1
 *               description: Overrides API_BASE_URL for the city image seeder child process.
 *     ElasticsearchSetupOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/InternalTaskOptions'
 *         - type: object
 *           properties:
 *             force:
 *               type: boolean
 *               example: true
 *               description: Recreates existing index/template when supported.
 *             createIndex:
 *               type: boolean
 *               example: true
 *               description: Only applies to logs setup.
 *     ElasticsearchSeederOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/InternalTaskOptions'
 *         - type: object
 *           properties:
 *             clear:
 *               type: boolean
 *               example: false
 *               description: Clears existing Elasticsearch documents before seeding.
 *             clearExisting:
 *               type: boolean
 *               example: false
 *               description: Alias for clear.
 *             batchSize:
 *               type: integer
 *               minimum: 1
 *               example: 100
 *             hotelIds:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 *                 - type: string
 *               example: ["018f5f6c-8c1a-7b9a-9c7a-a3b2f3d5e6f7"]
 *               description: Only applies to hotels seeding.
 *             status:
 *               type: string
 *               enum: [active, inactive, suspended]
 *               example: active
 *               description: Only applies to hotels seeding.
 *     MongodbSeederOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/InternalTaskOptions'
 *         - type: object
 *           properties:
 *             clear:
 *               type: boolean
 *               example: false
 *             clearExisting:
 *               type: boolean
 *               example: false
 *               description: Alias for clear.
 *             days:
 *               type: integer
 *               minimum: 1
 *               example: 90
 *             batch:
 *               type: integer
 *               minimum: 1
 *               example: 1000
 *             rows:
 *               type: integer
 *               minimum: 1
 *               example: 50000
 *               description: Only applies to search_logs.
 *             avgPerHotel:
 *               type: integer
 *               minimum: 1
 *               example: 50
 *               description: Only applies to hotel_views.
 *     NotificationTestRecipient:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *           example: Jane Doe
 *     NotificationTestTargetPreview:
 *       type: object
 *       properties:
 *         matchedUsers:
 *           type: integer
 *           example: 10
 *         sampleRecipients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/NotificationTestRecipient'
 *     NotificationTestFilters:
 *       type: object
 *       properties:
 *         userIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         role:
 *           type: string
 *           enum: [guest, user, admin, support_agent, owner, manager, staff]
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     InAppNotificationTestRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/NotificationTestFilters'
 *         - type: object
 *           required: [title, message]
 *           properties:
 *             title:
 *               type: string
 *               example: Notification workflow test
 *             message:
 *               type: string
 *               example: This is a test in-app notification from the internal admin API.
 *             category:
 *               type: string
 *               example: system
 *             priority:
 *               type: string
 *               enum: [low, normal, high, urgent]
 *               example: normal
 *             actionUrl:
 *               type: string
 *               example: /notifications
 *             actionLabel:
 *               type: string
 *               example: Open notifications
 *             metadata:
 *               type: object
 *               additionalProperties: true
 *     NotificationTestDispatchResult:
 *       type: object
 *       properties:
 *         eventId:
 *           type: string
 *           example: 4e8b9f7d-8d55-4d9f-9124-c5f1dbed6f2f
 *         matchedUsers:
 *           type: integer
 *           example: 10
 *         queuedEvents:
 *           type: integer
 *           example: 1
 *         sampleRecipients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/NotificationTestRecipient'
 *     EmailNotificationTestRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/NotificationTestFilters'
 *         - type: object
 *           required: [subject, message]
 *           properties:
 *             subject:
 *               type: string
 *               example: Email workflow test
 *             message:
 *               type: string
 *               example: This is a test email from the internal admin API.
 *             metadata:
 *               type: object
 *               additionalProperties: true
 *     NotificationTestSkippedUser:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *         reason:
 *           type: string
 *           enum: [missing_email, publish_failed]
 *     EmailNotificationTestDispatchResult:
 *       type: object
 *       properties:
 *         matchedUsers:
 *           type: integer
 *           example: 5
 *         queuedEvents:
 *           type: integer
 *           example: 5
 *         skippedUsers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/NotificationTestSkippedUser'
 *         sampleRecipients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/NotificationTestRecipient'
 */

/**
 * @swagger
 * /internal/superadmin/tasks:
 *   get:
 *     summary: List available internal setup and seeding tasks
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Available internal task names.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     databaseSeeders:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [all, user, amenity, hotel, hotel_amenity, room_inventory, room_amenity, permission, hotel_search_snapshot, images, review, room, booking, policy, cancellation_rule, nearby_place, notification, city, city_images, country, destination]
 *                     elasticsearchSetup:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [hotels, logs, destinations]
 *                     elasticsearchSeeders:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [hotels, destinations]
 *                     mongodbSeeders:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [search_logs, hotel_views]
 *                     runningTasks:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Superadmin authentication required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Superadmin access required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tasks', asyncHandler(controller.listTasks));

/**
 * @swagger
 * /internal/superadmin/database/init:
 *   post:
 *     summary: Initialize database tables
 *     description: Runs server/infra/database/init.js in a child process.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InternalTaskOptions'
 *     responses:
 *       200:
 *         description: Database init completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InternalTaskResult'
 *       409:
 *         description: The init task is already running.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database init failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/database/init', asyncHandler(controller.initDatabase));

/**
 * @swagger
 * /internal/superadmin/database/seeders/{seeder}:
 *   post:
 *     summary: Run a database seeder
 *     description: Runs one of the seeders located in server/seeders/database.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: seeder
 *         required: true
 *         schema:
 *           type: string
 *           enum: [all, user, amenity, hotel, hotel_amenity, room_inventory, room_amenity, permission, hotel_search_snapshot, images, review, room, booking, policy, cancellation_rule, nearby_place, notification, city, city_images, country, destination]
 *         example: all
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DatabaseSeederOptions'
 *           examples:
 *             quickAll:
 *               summary: Quick all-database seed
 *               value:
 *                 quick: true
 *                 skipImages: true
 *             clearSeeder:
 *               summary: Clear and run one seeder
 *               value:
 *                 clear: true
 *     responses:
 *       200:
 *         description: Seeder completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InternalTaskResult'
 *       404:
 *         description: Unknown seeder.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Seeder is already running.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/database/seeders/:seeder', asyncHandler(controller.runDatabaseSeeder));

/**
 * @swagger
 * /internal/superadmin/images/seed:
 *   post:
 *     summary: Run the image seeder
 *     description: Runs server/seeders/database/images.seed.js to upload hotel and room images through the API image pipeline.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ImageSeederOptions'
 *           examples:
 *             seedAllImages:
 *               summary: Seed all hotel and room images
 *               value:
 *                 apiBaseUrl: http://localhost:3000/api/v1
 *             seedHotelsOnly:
 *               summary: Seed first 10 hotels only
 *               value:
 *                 hotelsOnly: true
 *                 limit: 10
 *                 apiBaseUrl: http://localhost:3000/api/v1
 *             skipPrerequisiteChecks:
 *               summary: Skip prerequisite checks
 *               value:
 *                 skipChecks: true
 *                 roomsOnly: true
 *     responses:
 *       200:
 *         description: Image seeder completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InternalTaskResult'
 *       400:
 *         description: Invalid image seeder option.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Image seeder is already running.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Image seeder failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/images/seed', asyncHandler(controller.runImageSeeder));

/**
 * @swagger
 * /internal/superadmin/city-images/seed:
 *   post:
 *     summary: Run the city image seeder
 *     description: Runs server/seeders/database/city_images.seed.js to upload Vietnamese city images through the API image pipeline.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CityImageSeederOptions'
 *           examples:
 *             seedPrimaryCityImages:
 *               summary: Seed one primary image per city
 *               value:
 *                 primaryOnly: true
 *                 apiBaseUrl: http://localhost:3000/api/v1
 *             seedLimitedCities:
 *               summary: Seed first 10 cities
 *               value:
 *                 limit: 10
 *                 apiBaseUrl: http://localhost:3000/api/v1
 *             seedAllImagesPerCity:
 *               summary: Upload all city images to each city
 *               value:
 *                 allImages: true
 *                 limit: 3
 *     responses:
 *       200:
 *         description: City image seeder completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InternalTaskResult'
 *       400:
 *         description: Invalid city image seeder option.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: City image seeder is already running.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: City image seeder failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/city-images/seed', asyncHandler(controller.runCityImageSeeder));

/**
 * @swagger
 * /internal/superadmin/elasticsearch/setup/{target}:
 *   post:
 *     summary: Run Elasticsearch setup
 *     description: Runs setup scripts from server/infra/elasticsearch.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: target
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hotels, logs, destinations]
 *         example: hotels
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ElasticsearchSetupOptions'
 *           examples:
 *             recreateHotels:
 *               summary: Recreate hotels index
 *               value:
 *                 force: true
 *             setupLogsAndCreateIndex:
 *               summary: Recreate logs template and initial index
 *               value:
 *                 force: true
 *                 createIndex: true
 *     responses:
 *       200:
 *         description: Elasticsearch setup completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InternalTaskResult'
 *       404:
 *         description: Unknown Elasticsearch setup target.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Setup task is already running.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/elasticsearch/setup/:target', asyncHandler(controller.setupElasticsearch));

/**
 * @swagger
 * /internal/superadmin/elasticsearch/seeders/{target}:
 *   post:
 *     summary: Run an Elasticsearch seeder
 *     description: Runs one of the seeders located in server/seeders/elasticsearch.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: target
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hotels, destinations]
 *         example: hotels
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ElasticsearchSeederOptions'
 *           examples:
 *             activeHotels:
 *               summary: Seed active hotels
 *               value:
 *                 status: active
 *                 batchSize: 100
 *             clearDestinations:
 *               summary: Clear and seed destinations
 *               value:
 *                 clear: true
 *                 batchSize: 200
 *     responses:
 *       200:
 *         description: Elasticsearch seeder completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InternalTaskResult'
 *       404:
 *         description: Unknown Elasticsearch seeder target.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Seeder is already running.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/elasticsearch/seeders/:target', asyncHandler(controller.runElasticsearchSeeder));

/**
 * @swagger
 * /internal/superadmin/mongodb/seeders/{target}:
 *   post:
 *     summary: Run a MongoDB seeder
 *     description: Runs one of the seeders located in server/seeders/mongodb.
 *     tags:
 *       - Internal Superadmin
 *     security:
 *       - internalSuperadminToken: []
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: target
 *         required: true
 *         schema:
 *           type: string
 *           enum: [search_logs, hotel_views]
 *         example: search_logs
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MongodbSeederOptions'
 *           examples:
 *             searchLogs:
 *               summary: Seed search logs
 *               value:
 *                 rows: 50000
 *                 days: 90
 *                 batch: 2000
 *             hotelViews:
 *               summary: Seed hotel views
 *               value:
 *                 days: 30
 *                 avgPerHotel: 50
 *                 batch: 1000
 *     responses:
 *       200:
 *         description: MongoDB seeder completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InternalTaskResult'
 *       404:
 *         description: Unknown MongoDB seeder target.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Seeder is already running.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/mongodb/seeders/:target', asyncHandler(controller.runMongodbSeeder));

module.exports = router;
