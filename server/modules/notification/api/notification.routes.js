const express = require('express');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const notificationSchema = require('./guest.schema');
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} = require('./notification.controller');
const router = express.Router();

// root route: /api/notifications
// All routes require authentication
router.use(authenticate);

router.get('/', validate(notificationSchema.getNotifications), getNotifications);

router.get('/unread-count', validate(notificationSchema.getUnreadCount), getUnreadCount);

router.patch(
  '/read-all',
  validate(notificationSchema.markAllNotificationsAsRead),
  markAllNotificationsAsRead
);

router.patch(
  '/:notificationId/read',
  validate(notificationSchema.markNotificationAsRead),
  markNotificationAsRead
);

module.exports = router;
