const logger = require('@config/logger.config');

const { hasHotelAccess } = require('../permissions');

/**
 * Analytics events.
 */

function registerSubscribeAnalytics({ socket, userId, userRoles, hotelRoles }) {
  socket.on('analytics:subscribe', (hotelId, callback) => {
    try {
      if (!hasHotelAccess(hotelRoles, userRoles, hotelId)) {
        const error = {
          success: false,
          message: 'You do not have access to this hotel analytics',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      socket.join(`analytics_${hotelId}`);
      logger.info(`User ${userId} subscribed to analytics for hotel ${hotelId}`);

      if (callback) {
        callback({ success: true, message: 'Subscribed to analytics updates' });
      }
    } catch (error) {
      logger.error('Error subscribing to analytics:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to subscribe to analytics' });
      }
    }
  });
}

module.exports = { registerSubscribeAnalytics };
