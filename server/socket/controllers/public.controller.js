const logger = require('@config/logger.config');

/**
 * Public Namespace Controller (/public)
 * Handles connections from unauthenticated users (guests)
 * Limited functionality - mainly for real-time updates on public pages
 */

/**
 * Handle new connection to /public namespace
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Socket} socket - Socket instance
 */
exports.handleConnection = (namespace, socket) => {
  logger.info({ socketId: socket.id }, `Guest connected to /public namespace`);

  // Join public rooms for broadcasts
  socket.join('public_general');

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to public namespace',
    features: ['hotel_availability_updates', 'public_announcements', 'flash_deals'],
  });

  // ==================== Event: Join Hotel Page ====================
  // When guest views a specific hotel page
  socket.on('joinHotelPage', (hotelId, callback) => {
    try {
      if (!hotelId) {
        const error = { success: false, message: 'Hotel ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const roomName = `hotel_page_${hotelId}`;
      socket.join(roomName);

      logger.info(
        {
          hotelId,
          socketId: socket.id,
        },
        `Guest joined hotel page: ${hotelId}`
      );

      const response = {
        success: true,
        message: `Joined hotel page: ${hotelId}`,
      };

      if (callback) callback(response);
    } catch (error) {
      logger.error({ error }, 'Error joining hotel page:');
      const errorResponse = {
        success: false,
        message: 'Failed to join hotel page',
      };
      if (callback) callback(errorResponse);
    }
  });

  // ==================== Event: Leave Hotel Page ====================
  socket.on('leaveHotelPage', (hotelId, callback) => {
    try {
      const roomName = `hotel_page_${hotelId}`;
      socket.leave(roomName);

      logger.info({ hotelId, socketId: socket.id }, `Guest left hotel page: ${hotelId}`);

      if (callback) callback({ success: true });
    } catch (error) {
      logger.error({ error }, 'Error leaving hotel page:');
      if (callback) callback({ success: false, message: 'Failed to leave hotel page' });
    }
  });

  // ==================== Event: Check Availability ====================
  // Real-time availability check without authentication
  socket.on('checkAvailability', async (data, callback) => {
    try {
      const { hotelId, roomId, checkInDate, checkOutDate } = data;

      // This would typically call a service to check availability
      // For now, just acknowledge the request
      logger.info(
        {
          hotelId,
          roomId,
          socketId: socket.id,
        },
        'Availability check requested'
      );

      if (callback) {
        callback({
          success: true,
          message: 'Availability check initiated',
        });
      }
    } catch (error) {
      logger.error({ error }, 'Error checking availability:');
      if (callback) {
        callback({ success: false, message: 'Availability check failed' });
      }
    }
  });

  // ==================== Event: Disconnect ====================
  socket.on('disconnect', (reason) => {
    logger.info(
      {
        socketId: socket.id,
        reason,
      },
      `Guest disconnected from /public`
    );
  });

  // ==================== Error Handling ====================
  socket.on('error', (error) => {
    logger.error({ error }, 'Socket error in /public namespace:');
  });
};

/**
 * Broadcast availability update to all guests viewing a hotel page
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} hotelId - Hotel ID
 * @param {Object} availabilityData - Availability update data
 */
exports.broadcastAvailabilityUpdate = (namespace, hotelId, availabilityData) => {
  const roomName = `hotel_page_${hotelId}`;
  namespace.to(roomName).emit('availability:updated', availabilityData);
  logger.info({ hotelId }, `Broadcasted availability update to hotel page ${hotelId}`);
};

/**
 * Broadcast flash deal to all public users
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Object} dealData - Deal information
 */
exports.broadcastFlashDeal = (namespace, dealData) => {
  namespace.to('public_general').emit('deal:flash', dealData);
  logger.info('Broadcasted flash deal to public users');
};

/**
 * Broadcast public announcement
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Object} announcement - Announcement data
 */
exports.broadcastAnnouncement = (namespace, announcement) => {
  namespace.to('public_general').emit('announcement:new', announcement);
  logger.info('Broadcasted public announcement');
};
