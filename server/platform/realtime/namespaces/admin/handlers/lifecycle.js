const logger = require('@config/logger.config');

/**
 * Connection lifecycle events: disconnect and errors.
 */

function registerDisconnect({ socket, userId }) {
  socket.on('disconnect', (reason) => {
    logger.info(`Admin disconnected from /admin namespace`, {
      userId,
      socketId: socket.id,
      reason,
    });

    socket.to('administrators').emit('admin:offline', {
      adminId: userId,
      name: `${socket.user.firstName} ${socket.user.lastName}`,
    });
  });
}

function registerError({ socket, userId }) {
  socket.on('error', (error) => {
    logger.error('Socket error in /admin namespace:', { userId, error });
  });
}

module.exports = { registerDisconnect, registerError };
