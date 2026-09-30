const { notificationServiceClient } = require('../infrastructure/notification-service.client');

/**
 * Get notifications for a user (proxied to the notification service).
 */
async function getNotifications(userId, options = {}) {
  return notificationServiceClient.getNotifications(userId, options);
}

module.exports = { getNotifications };
