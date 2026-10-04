const logger = require('@config/logger.config');

/**
 * Monitoring events: follow a user or a hotel.
 */

function registerMonitorUser({ socket }) {
  socket.on('user:monitor', (userId, callback) => {
    try {
      if (!userId) {
        const error = { success: false, message: 'User ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      socket.join(`monitor_user_${userId}`);
      logger.info(`Admin ${socket.user.id} monitoring user ${userId}`);

      if (callback) {
        callback({ success: true, message: `Monitoring user ${userId}` });
      }
    } catch (error) {
      logger.error('Error monitoring user:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to monitor user' });
      }
    }
  });
}

function registerMonitorHotel({ socket }) {
  socket.on('hotel:monitor', (hotelId, callback) => {
    try {
      if (!hotelId) {
        const error = { success: false, message: 'Hotel ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      socket.join(`monitor_hotel_${hotelId}`);
      logger.info(`Admin ${socket.user.id} monitoring hotel ${hotelId}`);

      if (callback) {
        callback({ success: true, message: `Monitoring hotel ${hotelId}` });
      }
    } catch (error) {
      logger.error('Error monitoring hotel:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to monitor hotel' });
      }
    }
  });
}

module.exports = { registerMonitorUser, registerMonitorHotel };
