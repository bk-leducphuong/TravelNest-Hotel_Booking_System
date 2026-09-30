const { notificationServiceClient } = require('../infrastructure/notification-service.client');

/**
 * Mark all notifications as read for a user.
 *
 * @returns {Promise<number>} number of notifications updated
 */
async function markAllNotificationsAsRead(userId) {
  const result = await notificationServiceClient.markAllNotificationsAsRead(userId);
  return result.updatedCount;
}

module.exports = { markAllNotificationsAsRead };
