const logger = require('@config/logger.config');

/**
 * Outbound notifications to property staff (called from other modules).
 */

function sendNewBookingNotification(namespace, hotelId, bookingData) {
  namespace.to(`hotel_${hotelId}`).emit('booking:new', bookingData);
  logger.info(`Sent new booking notification to hotel ${hotelId}`);
}

function sendInventoryAlert(namespace, hotelId, alertData) {
  namespace.to(`hotel_${hotelId}`).emit('inventory:alert', alertData);
  logger.info(`Sent inventory alert to hotel ${hotelId}`);
}

function sendReviewAlert(namespace, hotelId, reviewData) {
  namespace.to(`hotel_${hotelId}`).emit('review:new', reviewData);
  logger.info(`Sent review alert to hotel ${hotelId}`);
}

module.exports = { sendNewBookingNotification, sendInventoryAlert, sendReviewAlert };
