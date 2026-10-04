const logger = require('@config/logger.config');

const { getPlatformStats } = require('../stats');

/**
 * Platform stats + system logs events.
 */

function registerGetPlatformStats({ namespace, socket, userId }) {
  socket.on('platform:getStats', async (callback) => {
    try {
      const stats = await getPlatformStats(namespace.server);

      logger.info(`Admin ${userId} requested platform stats`);

      if (callback) {
        callback({ success: true, stats });
      }
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to get stats' });
      }
    }
  });
}

function registerSubscribeLogs({ socket, userId }) {
  socket.on('logs:subscribe', (options, callback) => {
    try {
      const { level, service } = options || {};

      socket.join('system_logs');

      logger.info(`Admin ${userId} subscribed to system logs`, { level, service });

      if (callback) {
        callback({ success: true, message: 'Subscribed to system logs' });
      }
    } catch (error) {
      logger.error('Error subscribing to logs:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to subscribe to logs' });
      }
    }
  });
}

module.exports = { registerGetPlatformStats, registerSubscribeLogs };
