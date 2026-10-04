const logger = require('@config/logger.config');

const { hasHotelAccess, canManageInventory } = require('../permissions');

/**
 * Inventory events.
 */

function registerUpdateInventory({ namespace, socket, userId, userRoles, hotelRoles }) {
  socket.on('inventory:update', async (data, callback) => {
    try {
      const { hotelId, roomId, date, availableRooms } = data;

      if (!hotelId || !roomId || !date) {
        const error = { success: false, message: 'Hotel ID, room ID, and date are required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      if (!hasHotelAccess(hotelRoles, userRoles, hotelId)) {
        const error = { success: false, message: 'You do not have permission to update inventory' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      if (!canManageInventory(userRoles)) {
        const error = { success: false, message: 'Insufficient permissions to manage inventory' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      namespace.to(`hotel_${hotelId}`).emit('inventory:updated', {
        hotelId,
        roomId,
        date,
        availableRooms,
        updatedBy: userId,
        timestamp: new Date(),
      });

      logger.info(`Inventory updated for hotel ${hotelId}, room ${roomId}`, { userId });

      if (callback) {
        callback({ success: true, message: 'Inventory updated' });
      }
    } catch (error) {
      logger.error('Error updating inventory:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to update inventory' });
      }
    }
  });
}

module.exports = { registerUpdateInventory };
