const logger = require('@config/logger.config');

/**
 * Emit a notification to a Socket.IO room. Socket emission is best-effort: it
 * never throws into the caller's flow.
 *
 * `@platform/realtime` is required lazily to avoid a require cycle (socket
 * setup pulls in controllers that may reach back here).
 */
async function emitNotification(room, event, data) {
  try {
    const { getIO } = require('@platform/realtime');
    const io = getIO();

    io.to(room).emit(event, data, (acknowledgment) => {
      if (acknowledgment?.received) {
        logger.info(`Notification acknowledged by room ${room}`);
      } else {
        logger.warn(`Notification not acknowledged by room ${room}`);
      }
    });

    logger.info(`Emitted ${event} to room ${room}`);
  } catch (error) {
    logger.error(`Failed to emit notification to ${room}:`, error);
  }
}

module.exports = { emitNotification };
