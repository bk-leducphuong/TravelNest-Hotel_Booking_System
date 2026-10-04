const { handleConnection } = require('./connection');
const {
  sendNewBookingNotification,
  sendInventoryAlert,
  sendReviewAlert,
} = require('./notifications');

/**
 * Property Namespace Controller (/property) - public interface.
 *
 * Handles connections from hotel owners, managers and staff.
 */
module.exports = {
  handleConnection,
  sendNewBookingNotification,
  sendInventoryAlert,
  sendReviewAlert,
};
