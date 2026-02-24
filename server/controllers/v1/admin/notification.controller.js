const adminNotificationService = require('@services/admin/notification.service');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Admin Notification Controller - HTTP ↔ business logic mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/admin/notifications
 * Get all notifications for a specific hotel
 */
const getNotifications = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, isRead, page, limit } = req.query;

  const result = await adminNotificationService.getNotifications(hotelId, ownerId, {
    isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.status(200).json({
    data: result.notifications,
    unreadCount: result.unreadCount,
    pagination: result.pagination,
  });
});

/**
 * GET /api/admin/notifications/:notificationId
 * Get a specific notification by ID
 */
const getNotificationById = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { notificationId } = req.params;

  const notification = await adminNotificationService.getNotificationById(notificationId, ownerId);

  res.status(200).json({
    data: notification,
  });
});

/**
 * PATCH /api/admin/notifications/:notificationId/read
 * Mark a specific notification as read
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { notificationId } = req.params;

  const notification = await adminNotificationService.markNotificationAsRead(
    notificationId,
    ownerId
  );

  res.status(200).json({
    data: notification,
    message: 'Notification marked as read',
  });
});

/**
 * PATCH /api/admin/notifications/read-all
 * Mark all notifications as read for a hotel
 */
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId } = req.body;

  const result = await adminNotificationService.markAllNotificationsAsRead(hotelId, ownerId);

  res.status(200).json({
    data: result,
  });
});

/**
 * DELETE /api/admin/notifications/:notificationId
 * Delete a notification
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { notificationId } = req.params;

  const result = await adminNotificationService.deleteNotification(notificationId, ownerId);

  res.status(200).json({
    data: result,
  });
});

module.exports = {
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
