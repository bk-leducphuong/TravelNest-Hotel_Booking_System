const logger = require('@config/logger.config');

/**
 * Connection lifecycle events: disconnect and errors.
 */

function registerDisconnect({ socket, userId, hotelRoles }) {
  socket.on('disconnect', (reason) => {
    logger.info(`Property user disconnected from /property namespace`, {
      userId,
      socketId: socket.id,
      reason,
    });

    hotelRoles.forEach((hotelRole) => {
      socket.to(`hotel_${hotelRole.hotelId}`).emit('staff:offline', {
        userId,
        name: `${socket.user.firstName} ${socket.user.lastName}`,
        role: hotelRole.role,
      });
    });
  });
}

function registerError({ socket, userId }) {
  socket.on('error', (error) => {
    logger.error('Socket error in /property namespace:', { userId, error });
  });
}

module.exports = { registerDisconnect, registerError };
