const notificationRepository = require('../infrastructure/notification.repository');

const { notificationServiceClient } = require('../infrastructure/notification-service.client');

/**
 * Get the unread notification count for a user.
 *
 * By default this asks the notification service; with `byCategory` it returns a
 * per-category breakdown from the local repository.
 *
 * @param {string} userId
 * @param {{ byCategory?: boolean }} options
 */
async function getUnreadCount(userId, options = {}) {
  const { byCategory = false } = options;

  if (byCategory) {
    return notificationRepository.countByCategory(userId);
  }

  const result = await notificationServiceClient.getUnreadCount(userId);
  return result.unreadCount;
}

module.exports = { getUnreadCount };
