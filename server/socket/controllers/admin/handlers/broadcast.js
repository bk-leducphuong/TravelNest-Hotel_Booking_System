const logger = require('@config/logger.config');

/**
 * Global broadcast event.
 */

function registerBroadcastGlobal({ namespace, socket, userId }) {
  socket.on('broadcast:global', (data, callback) => {
    try {
      const { message, targetNamespace, targetGroup } = data;

      if (!message) {
        const error = { success: false, message: 'Message is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const broadcastData = {
        message,
        from: {
          adminId: userId,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
        },
        timestamp: new Date(),
        priority: data.priority || 'normal',
      };

      if (targetNamespace) {
        namespace.server.of(targetNamespace).emit('admin:broadcast', broadcastData);
        logger.info(`Admin ${userId} broadcasted to namespace ${targetNamespace}`);
      } else if (targetGroup) {
        namespace.server.emit('admin:broadcast', { ...broadcastData, targetGroup });
        logger.info(`Admin ${userId} broadcasted to group ${targetGroup}`);
      } else {
        namespace.server.emit('admin:broadcast', broadcastData);
        logger.info(`Admin ${userId} broadcasted globally`);
      }

      if (callback) {
        callback({ success: true, message: 'Broadcast sent' });
      }
    } catch (error) {
      logger.error('Error broadcasting:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to broadcast' });
      }
    }
  });
}

module.exports = { registerBroadcastGlobal };
