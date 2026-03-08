const express = require('express');
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} = require('@controllers/v1/notification.controller.js');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const notificationSchema = require('@validators/v1/notification.schema');
const router = express.Router();

// root route: /api/notifications
// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       description: Notification sent to a user
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Notification identifier (UUIDv7)
 *         receiver_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user receiving the notification
 *         sender_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID of the user who triggered the notification (null for system notifications)
 *         notification_type:
 *           type: string
 *           description: Machine-readable notification type
 *           enum:
 *             - booking_new
 *             - booking_confirmed
 *             - booking_cancelled
 *             - booking_completed
 *             - booking_status_update
 *             - payment_success
 *             - payment_failed
 *             - payment_refund
 *             - payout_completed
 *             - payout_failed
 *             - review_new
 *             - review_response
 *             - message_new
 *             - system_alert
 *             - promotion
 *             - account_update
 *         category:
 *           type: string
 *           description: High-level notification category
 *           enum: [booking, payment, review, message, system, marketing]
 *         priority:
 *           type: string
 *           description: Priority level of the notification
 *           enum: [low, normal, high, urgent]
 *         title:
 *           type: string
 *           description: Short notification title
 *         message:
 *           type: string
 *           description: Full notification message body
 *         metadata:
 *           type: object
 *           nullable: true
 *           description: Additional structured data (booking details, amounts, etc.)
 *         related_entity_type:
 *           type: string
 *           nullable: true
 *           description: Type of related entity
 *           enum:
 *             - booking
 *             - payment
 *             - transaction
 *             - review
 *             - hotel
 *             - room
 *             - user
 *             - refund
 *         related_entity_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID of related entity
 *         action_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Deep link or URL to take action for this notification
 *         action_label:
 *           type: string
 *           nullable: true
 *           description: Label for action button (e.g., "View booking")
 *         is_read:
 *           type: boolean
 *           description: Whether the notification has been marked as read
 *         read_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when the notification was read
 *         expires_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Optional expiry date for time-sensitive notifications
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         sender:
 *           type: object
 *           nullable: true
 *           description: Basic information about the sender (when available)
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             first_name:
 *               type: string
 *             last_name:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 *     NotificationListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Notification'
 *         meta:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 20
 *             total:
 *               type: integer
 *               example: 42
 *     NotificationUnreadCountResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             unreadCount:
 *               type: integer
 *               example: 5
 *     NotificationMarkReadResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: Notification marked as read
 *     NotificationMarkAllReadResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: All notifications marked as read
 *             updatedCount:
 *               type: integer
 *               description: Number of notifications that were updated
 *               example: 10

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications for authenticated user
 *     description: Returns a paginated list of notifications for the currently authenticated user.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: If true, only unread notifications are returned
 *     responses:
 *       200:
 *         description: List of notifications for the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', validate(notificationSchema.getNotifications), getNotifications);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: Returns the number of unread notifications for the authenticated user.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationUnreadCountResponse'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/unread-count', validate(notificationSchema.getUnreadCount), getUnreadCount);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications for the authenticated user as read.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationMarkAllReadResponse'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/read-all',
  validate(notificationSchema.markAllNotificationsAsRead),
  markAllNotificationsAsRead
);

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a specific notification as read
 *     description: Marks a single notification as read. The notification must belong to the authenticated user.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the notification to mark as read
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationMarkReadResponse'
 *       400:
 *         description: Validation error (invalid notificationId)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Notification not found or does not belong to the user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/:notificationId/read',
  validate(notificationSchema.markNotificationAsRead),
  markNotificationAsRead
);

module.exports = router;
