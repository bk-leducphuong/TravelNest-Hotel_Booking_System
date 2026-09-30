const { getNotifications } = require('./application/getNotifications');
const { markNotificationAsRead } = require('./application/markNotificationAsRead');
const { markAllNotificationsAsRead } = require('./application/markAllNotificationsAsRead');
const { getUnreadCount } = require('./application/getUnreadCount');
const { getStatistics } = require('./application/getStatistics');
const { sendPayoutNotification } = require('./application/sendPayoutNotification');

/**
 * Notification module - public interface.
 *
 * Guest notification reads proxy to the Go notification service (which owns the
 * notifications table); payout notifications are still created + emitted from
 * Node. Cross-module callers must use this index.
 */
module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  getStatistics,
  sendPayoutNotification,
};
