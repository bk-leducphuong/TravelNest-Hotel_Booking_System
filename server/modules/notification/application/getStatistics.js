const notificationRepository = require('@repositories/notification.repository');

/**
 * Get notification statistics for a user.
 */
async function getStatistics(userId) {
  return notificationRepository.getStatistics(userId);
}

module.exports = { getStatistics };
