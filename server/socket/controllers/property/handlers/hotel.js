const logger = require('@config/logger.config');
const { ROLES } = require('@constants/roles');

const { findHotelRole, isOwnerOrManager } = require('../permissions');
const { getOnlineStaffInRoom } = require('../online-staff');

/**
 * Hotel-level events: set active hotel, view online staff, broadcast to staff.
 */

function registerSetActiveHotel({ socket, userId, userRoles, hotelRoles }) {
  socket.on('hotel:setActive', (hotelId, callback) => {
    try {
      const hotelRole = findHotelRole(hotelRoles, hotelId);

      if (!hotelRole && !userRoles.includes(ROLES.ADMIN)) {
        const error = { success: false, message: 'You do not have access to this hotel' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      socket.activeHotelId = hotelId;
      socket.activeHotelRole = hotelRole?.role || ROLES.ADMIN;

      logger.info(`User ${userId} set active hotel to ${hotelId}`, {
        role: socket.activeHotelRole,
      });

      if (callback) {
        callback({ success: true, hotelId, role: socket.activeHotelRole });
      }
    } catch (error) {
      logger.error('Error setting active hotel:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to set active hotel' });
      }
    }
  });
}

function registerGetOnlineStaff({ namespace, socket, userRoles, hotelRoles }) {
  socket.on('staff:getOnline', (hotelId, callback) => {
    try {
      if (!isOwnerOrManager(hotelRoles, userRoles, hotelId)) {
        const error = {
          success: false,
          message: 'Only owners and managers can view staff activity',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const onlineStaff = getOnlineStaffInRoom(namespace, `hotel_${hotelId}`);

      if (callback) {
        callback({ success: true, onlineStaff });
      }
    } catch (error) {
      logger.error('Error getting online staff:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to get online staff' });
      }
    }
  });
}

function registerBroadcastToHotel({ socket, userId, userRoles, hotelRoles }) {
  socket.on('hotel:broadcast', (data, callback) => {
    try {
      const { hotelId, message } = data;

      if (!hotelId || !message) {
        const error = { success: false, message: 'Hotel ID and message are required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      if (!isOwnerOrManager(hotelRoles, userRoles, hotelId)) {
        const error = {
          success: false,
          message: 'Only owners and managers can broadcast messages',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const hotelRole = findHotelRole(hotelRoles, hotelId);
      socket.to(`hotel_${hotelId}`).emit('hotel:announcement', {
        message,
        from: {
          userId,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
          role: hotelRole.role,
        },
        timestamp: new Date(),
      });

      logger.info(`User ${userId} broadcasted message to hotel ${hotelId}`);

      if (callback) {
        callback({ success: true, message: 'Message broadcasted' });
      }
    } catch (error) {
      logger.error('Error broadcasting message:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to broadcast message' });
      }
    }
  });
}

module.exports = { registerSetActiveHotel, registerGetOnlineStaff, registerBroadcastToHotel };
