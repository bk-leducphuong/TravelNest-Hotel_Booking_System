const logger = require('@config/logger.config');

const { hasHotelAccess } = require('../permissions');

/**
 * Booking events: subscribe to a booking room, update booking status.
 */

function registerSubscribeBookings({ socket, userId }) {
  socket.on('bookings:subscribe', (bookingId, callback) => {
    try {
      if (!bookingId) {
        const error = { success: false, message: 'Booking ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      socket.join(`booking_${bookingId}`);
      logger.info(`Property user ${userId} subscribed to booking ${bookingId}`);

      if (callback) {
        callback({ success: true, message: `Subscribed to booking ${bookingId}` });
      }
    } catch (error) {
      logger.error('Error subscribing to booking:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to subscribe' });
      }
    }
  });
}

function registerUpdateBookingStatus({ namespace, socket, userId, userRoles, hotelRoles }) {
  socket.on('bookings:updateStatus', async (data, callback) => {
    try {
      const { bookingId, status, hotelId } = data;

      if (!bookingId || !status) {
        const error = { success: false, message: 'Booking ID and status are required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      if (!hasHotelAccess(hotelRoles, userRoles, hotelId)) {
        const error = {
          success: false,
          message: 'You do not have permission to update this booking',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // TODO: call the booking module to persist the status change.
      namespace.to(`booking_${bookingId}`).emit('booking:statusUpdated', {
        bookingId,
        status,
        updatedBy: userId,
        timestamp: new Date(),
      });

      logger.info(`Booking ${bookingId} status updated to ${status} by user ${userId}`);

      if (callback) {
        callback({ success: true, message: 'Booking status updated' });
      }
    } catch (error) {
      logger.error('Error updating booking status:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to update booking status' });
      }
    }
  });
}

module.exports = { registerSubscribeBookings, registerUpdateBookingStatus };
