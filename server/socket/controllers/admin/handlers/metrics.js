const logger = require('@config/logger.config');

/**
 * System metrics + maintenance-mode events.
 */

function registerSubscribeMetrics({ socket, userId }) {
  socket.on('system:subscribeMetrics', (callback) => {
    try {
      socket.join('system_metrics');
      logger.info(`Admin ${userId} subscribed to system metrics`);

      if (callback) {
        callback({ success: true, message: 'Subscribed to system metrics' });
      }
    } catch (error) {
      logger.error('Error subscribing to system metrics:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to subscribe' });
      }
    }
  });
}

function registerMaintenanceMode({ namespace, socket, userId }) {
  socket.on('system:maintenanceMode', (data, callback) => {
    try {
      const { enabled, message } = data;

      namespace.server.emit('system:maintenance', {
        enabled,
        message,
        activatedBy: userId,
        timestamp: new Date(),
      });

      logger.warn(`Admin ${userId} ${enabled ? 'enabled' : 'disabled'} maintenance mode`);

      if (callback) {
        callback({
          success: true,
          message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
        });
      }
    } catch (error) {
      logger.error('Error toggling maintenance mode:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to toggle maintenance mode' });
      }
    }
  });
}

module.exports = { registerSubscribeMetrics, registerMaintenanceMode };
