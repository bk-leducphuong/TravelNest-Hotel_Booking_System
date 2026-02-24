const logger = require('@config/logger.config');
const notificationService = require('@services/notification.service');

/**
 * User Namespace Controller (/user)
 * Handles connections from authenticated regular users (customers)
 * Features: bookings, notifications, favorites, chat support
 */

/**
 * Handle new connection to /user namespace
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Socket} socket - Socket instance
 */
exports.handleConnection = (namespace, socket) => {
  const userId = socket.user.id;

  logger.info(`User connected to /user namespace`, {
    userId,
    socketId: socket.id,
  });

  // Join user's personal room for targeted notifications
  const userRoom = `user_${userId}`;
  socket.join(userRoom);

  // Send welcome message with user info
  socket.emit('connected', {
    message: 'Connected to user namespace',
    user: {
      id: socket.user.id,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName,
    },
    features: ['booking_updates', 'notifications', 'chat_support', 'favorites_sync'],
  });

  // ==================== Event: Get Unread Notifications Count ====================
  // socket.on('notifications:getUnreadCount', async (callback) => {
  //   try {
  //     const count = await notificationService.getUnreadCount(userId);
  //
  //     if (callback) {
  //       callback({ success: true, count });
  //     }
  //   } catch (error) {
  //     logger.error('Error getting unread count:', error);
  //     if (callback) {
  //       callback({ success: false, message: 'Failed to get unread count' });
  //     }
  //   }
  // });

  // ==================== Event: Mark Notification as Read ====================
  // socket.on('notifications:markAsRead', async (notificationId, callback) => {
  //   try {
  //     await notificationService.markNotificationAsRead(notificationId, userId);
  //
  //     if (callback) {
  //       callback({ success: true, message: 'Notification marked as read' });
  //     }
  //
  //     // Broadcast updated count
  //     const count = await notificationService.getUnreadCount(userId);
  //     socket.emit('notifications:unreadCountUpdate', { count });
  //   } catch (error) {
  //     logger.error('Error marking notification as read:', error);
  //     if (callback) {
  //       callback({ success: false, message: error.message });
  //     }
  //   }
  // });

  // ==================== Event: Mark All Notifications as Read ====================
  // socket.on('notifications:markAllAsRead', async (callback) => {
  //   try {
  //     await notificationService.markAllNotificationsAsRead(userId);
  //
  //     if (callback) {
  //       callback({ success: true, message: 'All notifications marked as read' });
  //     }
  //
  //     // Broadcast updated count
  //     socket.emit('notifications:unreadCountUpdate', { count: 0 });
  //   } catch (error) {
  //     logger.error('Error marking all notifications as read:', error);
  //     if (callback) {
  //       callback({ success: false, message: 'Failed to mark all as read' });
  //     }
  //   }
  // });

  // ==================== Event: Subscribe to Booking Updates ====================
  socket.on('bookings:subscribe', (bookingId, callback) => {
    try {
      if (!bookingId) {
        const error = { success: false, message: 'Booking ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const roomName = `booking_${bookingId}`;
      socket.join(roomName);

      logger.info(`User ${userId} subscribed to booking ${bookingId}`, {
        socketId: socket.id,
      });

      if (callback) {
        callback({
          success: true,
          message: `Subscribed to booking ${bookingId}`,
        });
      }
    } catch (error) {
      logger.error('Error subscribing to booking:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to subscribe to booking' });
      }
    }
  });

  // ==================== Event: Unsubscribe from Booking Updates ====================
  socket.on('bookings:unsubscribe', (bookingId, callback) => {
    try {
      const roomName = `booking_${bookingId}`;
      socket.leave(roomName);

      logger.info(`User ${userId} unsubscribed from booking ${bookingId}`);

      if (callback) {
        callback({ success: true });
      }
    } catch (error) {
      logger.error('Error unsubscribing from booking:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to unsubscribe' });
      }
    }
  });

  // ==================== Event: Join Support Chat ====================
  // socket.on('support:joinChat', (ticketId, callback) => {
  //   try {
  //     if (!ticketId) {
  //       const error = { success: false, message: 'Ticket ID is required' };
  //       return callback ? callback(error) : socket.emit('error', error);
  //     }
  //
  //     const chatRoom = `support_chat_${ticketId}`;
  //     socket.join(chatRoom);
  //
  //     logger.info(`User ${userId} joined support chat ${ticketId}`, {
  //       socketId: socket.id,
  //     });
  //
  //     if (callback) {
  //       callback({ success: true, message: 'Joined support chat' });
  //     }
  //   } catch (error) {
  //     logger.error('Error joining support chat:', error);
  //     if (callback) {
  //       callback({ success: false, message: 'Failed to join support chat' });
  //     }
  //   }
  // });

  // ==================== Event: Send Support Message ====================
  // socket.on('support:sendMessage', async (data, callback) => {
  //   try {
  //     const { ticketId, message } = data;
  //
  //     if (!ticketId || !message) {
  //       const error = {
  //         success: false,
  //         message: 'Ticket ID and message are required',
  //       };
  //       return callback ? callback(error) : socket.emit('error', error);
  //     }
  //
  //     // Broadcast to support agents and user
  //     const chatRoom = `support_chat_${ticketId}`;
  //     namespace.to(chatRoom).emit('support:messageReceived', {
  //       ticketId,
  //       message,
  //       sender: {
  //         id: userId,
  //         name: `${socket.user.firstName} ${socket.user.lastName}`,
  //         type: 'user',
  //       },
  //       timestamp: new Date(),
  //     });
  //
  //     logger.info(`User ${userId} sent support message for ticket ${ticketId}`);
  //
  //     if (callback) {
  //       callback({ success: true, message: 'Message sent' });
  //     }
  //   } catch (error) {
  //     logger.error('Error sending support message:', error);
  //     if (callback) {
  //       callback({ success: false, message: 'Failed to send message' });
  //     }
  //   }
  // });

  // ==================== Event: Typing Indicator ====================
  // socket.on('support:typing', (ticketId) => {
  //   const chatRoom = `support_chat_${ticketId}`;
  //   socket.to(chatRoom).emit('support:userTyping', {
  //     userId,
  //     userName: `${socket.user.firstName} ${socket.user.lastName}`,
  //   });
  // });

  // ==================== Event: Disconnect ====================
  socket.on('disconnect', (reason) => {
    logger.info(`User disconnected from /user namespace`, {
      userId,
      socketId: socket.id,
      reason,
    });
  });

  // ==================== Error Handling ====================
  socket.on('error', (error) => {
    logger.error('Socket error in /user namespace:', { userId, error });
  });
};

/**
 * Send notification to specific user
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 */
exports.sendNotification = (namespace, userId, notification) => {
  const userRoom = `user_${userId}`;
  namespace.to(userRoom).emit('notification:new', notification);
  logger.info(`Sent notification to user ${userId}`);
};

/**
 * Send booking update to user
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} userId - User ID
 * @param {string} bookingId - Booking ID
 * @param {Object} updateData - Update data
 */
exports.sendBookingUpdate = (namespace, userId, bookingId, updateData) => {
  const userRoom = `user_${userId}`;
  const bookingRoom = `booking_${bookingId}`;

  namespace.to(userRoom).to(bookingRoom).emit('booking:updated', updateData);
  logger.info(`Sent booking update to user ${userId} for booking ${bookingId}`);
};
