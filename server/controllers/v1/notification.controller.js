const notificationService = require('@services/notification.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Notification Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/notifications
 * Get notifications for authenticated user
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { page, limit, unreadOnly } = req.query;

  const result = await notificationService.getNotifications(userId, {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
    unreadOnly: unreadOnly === 'true',
  });

  res.status(200).json({
    data: result.notifications,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  });
});

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a specific notification as read
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { notificationId } = req.params;

  await notificationService.markNotificationAsRead(notificationId, userId);

  res.status(200).json({
    data: {
      message: 'Notification marked as read',
    },
  });
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for authenticated user
 */
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;

  const updatedCount = await notificationService.markAllNotificationsAsRead(userId);

  res.status(200).json({
    data: {
      message: 'All notifications marked as read',
      updatedCount,
    },
  });
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for authenticated user
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;

  const count = await notificationService.getUnreadCount(userId);

  res.status(200).json({
    data: {
      unreadCount: count,
    },
  });
});

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
};
