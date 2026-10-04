const { notificationServiceClient } = require('../infrastructure/notification-service.client');

/**
 * Mark a single notification as read for its owner.
 */
async function markNotificationAsRead(notificationId, userId) {
  await notificationServiceClient.markNotificationAsRead(notificationId, userId);
}

module.exports = { markNotificationAsRead };
