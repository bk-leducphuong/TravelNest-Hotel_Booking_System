const { logger } = require('@config/logger.config');
const { ROLES, HOTEL_ROLES } = require('@constants/roles');

/**
 * Property Namespace Controller (/property)
 * Handles connections from hotel owners, managers, and staff
 * Features: booking management, inventory, notifications, analytics
 */

/**
 * Handle new connection to /property namespace
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Socket} socket - Socket instance
 */
exports.handleConnection = (namespace, socket) => {
  const userId = socket.user.id;
  const userRoles = socket.user.roles;
  const hotelRoles = socket.user.hotelRoles;

  logger.info(`Property user connected to /property namespace`, {
    userId,
    roles: userRoles,
    hotelCount: hotelRoles.length,
    socketId: socket.id,
  });

  // Join user's personal room
  const userRoom = `property_user_${userId}`;
  socket.join(userRoom);

  // Auto-join rooms for all hotels user has access to
  hotelRoles.forEach((hotelRole) => {
    const hotelRoom = `hotel_${hotelRole.hotelId}`;
    socket.join(hotelRoom);
    logger.info(`Auto-joined hotel room: ${hotelRoom}`, { userId });
  });

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to property namespace',
    user: {
      id: userId,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName,
      roles: userRoles,
    },
    hotels: hotelRoles.map((hr) => ({
      hotelId: hr.hotelId,
      role: hr.role,
      isPrimaryOwner: hr.isPrimaryOwner,
    })),
    features: [
      'booking_notifications',
      'inventory_updates',
      'review_alerts',
      'analytics_realtime',
      'staff_management',
    ],
  });

  // ==================== Event: Set Active Hotel ====================
  socket.on('hotel:setActive', (hotelId, callback) => {
    try {
      // Verify user has access to this hotel
      const hotelRole = hotelRoles.find((hr) => hr.hotelId === hotelId);

      if (!hotelRole && !userRoles.includes(ROLES.ADMIN)) {
        const error = {
          success: false,
          message: 'You do not have access to this hotel',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Set active hotel context
      socket.activeHotelId = hotelId;
      socket.activeHotelRole = hotelRole?.role || ROLES.ADMIN;

      logger.info(`User ${userId} set active hotel to ${hotelId}`, {
        role: socket.activeHotelRole,
      });

      if (callback) {
        callback({
          success: true,
          hotelId,
          role: socket.activeHotelRole,
        });
      }
    } catch (error) {
      logger.error('Error setting active hotel:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to set active hotel' });
      }
    }
  });

  // ==================== Event: Subscribe to Booking Updates ====================
  socket.on('bookings:subscribe', (bookingId, callback) => {
    try {
      if (!bookingId) {
        const error = { success: false, message: 'Booking ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const roomName = `booking_${bookingId}`;
      socket.join(roomName);

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

  // ==================== Event: Update Booking Status ====================
  socket.on('bookings:updateStatus', async (data, callback) => {
    try {
      const { bookingId, status, hotelId } = data;

      if (!bookingId || !status) {
        const error = {
          success: false,
          message: 'Booking ID and status are required',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Verify permission for this hotel
      const hotelRole = hotelRoles.find((hr) => hr.hotelId === hotelId);

      if (!hotelRole && !userRoles.includes(ROLES.ADMIN)) {
        const error = {
          success: false,
          message: 'You do not have permission to update this booking',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // This would call booking service to update status
      // For now, just broadcast the update
      const bookingRoom = `booking_${bookingId}`;
      namespace.to(bookingRoom).emit('booking:statusUpdated', {
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

  // ==================== Event: Update Room Inventory ====================
  socket.on('inventory:update', async (data, callback) => {
    try {
      const { hotelId, roomId, date, availableRooms } = data;

      if (!hotelId || !roomId || !date) {
        const error = {
          success: false,
          message: 'Hotel ID, room ID, and date are required',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Verify permission
      const hotelRole = hotelRoles.find((hr) => hr.hotelId === hotelId);

      if (!hotelRole && !userRoles.includes(ROLES.ADMIN)) {
        const error = {
          success: false,
          message: 'You do not have permission to update inventory',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Check if user has inventory management permission
      if (
        ![ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.ADMIN].some((role) =>
          userRoles.includes(role)
        )
      ) {
        const error = {
          success: false,
          message: 'Insufficient permissions to manage inventory',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Broadcast inventory update to all property users for this hotel
      const hotelRoom = `hotel_${hotelId}`;
      namespace.to(hotelRoom).emit('inventory:updated', {
        hotelId,
        roomId,
        date,
        availableRooms,
        updatedBy: userId,
        timestamp: new Date(),
      });

      logger.info(`Inventory updated for hotel ${hotelId}, room ${roomId}`, {
        userId,
      });

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

  // ==================== Event: Request Analytics Update ====================
  socket.on('analytics:subscribe', (hotelId, callback) => {
    try {
      // Verify permission
      const hotelRole = hotelRoles.find((hr) => hr.hotelId === hotelId);

      if (!hotelRole && !userRoles.includes(ROLES.ADMIN)) {
        const error = {
          success: false,
          message: 'You do not have access to this hotel analytics',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Join analytics room
      const analyticsRoom = `analytics_${hotelId}`;
      socket.join(analyticsRoom);

      logger.info(`User ${userId} subscribed to analytics for hotel ${hotelId}`);

      if (callback) {
        callback({
          success: true,
          message: 'Subscribed to analytics updates',
        });
      }
    } catch (error) {
      logger.error('Error subscribing to analytics:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to subscribe to analytics' });
      }
    }
  });

  // ==================== Event: Staff Activity (for owners/managers) ====================
  socket.on('staff:getOnline', (hotelId, callback) => {
    try {
      // Verify permission (only owners and managers)
      const hotelRole = hotelRoles.find((hr) => hr.hotelId === hotelId);

      if (
        !hotelRole ||
        (![HOTEL_ROLES.OWNER, HOTEL_ROLES.MANAGER].includes(hotelRole.role) &&
          !userRoles.includes(ROLES.ADMIN))
      ) {
        const error = {
          success: false,
          message: 'Only owners and managers can view staff activity',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Get online staff for this hotel
      // This would query active sockets in the hotel room
      const hotelRoom = `hotel_${hotelId}`;
      const onlineStaff = getOnlineStaffInRoom(namespace, hotelRoom);

      if (callback) {
        callback({
          success: true,
          onlineStaff,
        });
      }
    } catch (error) {
      logger.error('Error getting online staff:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to get online staff' });
      }
    }
  });

  // ==================== Event: Broadcast to Hotel Staff ====================
  socket.on('hotel:broadcast', (data, callback) => {
    try {
      const { hotelId, message } = data;

      if (!hotelId || !message) {
        const error = {
          success: false,
          message: 'Hotel ID and message are required',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Verify permission (only owners and managers can broadcast)
      const hotelRole = hotelRoles.find((hr) => hr.hotelId === hotelId);

      if (
        !hotelRole ||
        (![HOTEL_ROLES.OWNER, HOTEL_ROLES.MANAGER].includes(hotelRole.role) &&
          !userRoles.includes(ROLES.ADMIN))
      ) {
        const error = {
          success: false,
          message: 'Only owners and managers can broadcast messages',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Broadcast to all staff in hotel
      const hotelRoom = `hotel_${hotelId}`;
      socket.to(hotelRoom).emit('hotel:announcement', {
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

  // ==================== Event: Disconnect ====================
  socket.on('disconnect', (reason) => {
    logger.info(`Property user disconnected from /property namespace`, {
      userId,
      socketId: socket.id,
      reason,
    });

    // Notify other staff in hotels that user went offline
    hotelRoles.forEach((hotelRole) => {
      const hotelRoom = `hotel_${hotelRole.hotelId}`;
      socket.to(hotelRoom).emit('staff:offline', {
        userId,
        name: `${socket.user.firstName} ${socket.user.lastName}`,
        role: hotelRole.role,
      });
    });
  });

  // ==================== Error Handling ====================
  socket.on('error', (error) => {
    logger.error('Socket error in /property namespace:', { userId, error });
  });
};

/**
 * Helper: Get online staff in a hotel room
 */
function getOnlineStaffInRoom(namespace, roomName) {
  const room = namespace.adapter.rooms.get(roomName);
  if (!room) return [];

  const onlineStaff = [];
  for (const socketId of room) {
    const socket = namespace.sockets.get(socketId);
    if (socket && socket.user) {
      onlineStaff.push({
        userId: socket.user.id,
        name: `${socket.user.firstName} ${socket.user.lastName}`,
        roles: socket.user.roles,
      });
    }
  }

  return onlineStaff;
}

/**
 * Send new booking notification to hotel staff
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} hotelId - Hotel ID
 * @param {Object} bookingData - Booking data
 */
exports.sendNewBookingNotification = (namespace, hotelId, bookingData) => {
  const hotelRoom = `hotel_${hotelId}`;
  namespace.to(hotelRoom).emit('booking:new', bookingData);
  logger.info(`Sent new booking notification to hotel ${hotelId}`);
};

/**
 * Send inventory alert to hotel staff
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} hotelId - Hotel ID
 * @param {Object} alertData - Alert data
 */
exports.sendInventoryAlert = (namespace, hotelId, alertData) => {
  const hotelRoom = `hotel_${hotelId}`;
  namespace.to(hotelRoom).emit('inventory:alert', alertData);
  logger.info(`Sent inventory alert to hotel ${hotelId}`);
};

/**
 * Send review alert to hotel staff
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} hotelId - Hotel ID
 * @param {Object} reviewData - Review data
 */
exports.sendReviewAlert = (namespace, hotelId, reviewData) => {
  const hotelRoom = `hotel_${hotelId}`;
  namespace.to(hotelRoom).emit('review:new', reviewData);
  logger.info(`Sent review alert to hotel ${hotelId}`);
};
