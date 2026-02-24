const logger = require('@config/logger.config');

/**
 * Admin Namespace Controller (/admin)
 * Handles connections from platform administrators
 * Features: system monitoring, user management, analytics, broadcasts
 */

/**
 * Handle new connection to /admin namespace
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Socket} socket - Socket instance
 */
exports.handleConnection = (namespace, socket) => {
  const userId = socket.user.id;

  logger.info(`Admin connected to /admin namespace`, {
    userId,
    socketId: socket.id,
  });

  // Join admin room
  socket.join('administrators');

  // Join admin's personal room
  const adminRoom = `admin_${userId}`;
  socket.join(adminRoom);

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to admin namespace',
    admin: {
      id: userId,
      name: `${socket.user.firstName} ${socket.user.lastName}`,
    },
    features: [
      'system_monitoring',
      'user_management',
      'platform_analytics',
      'global_broadcasts',
      'hotel_oversight',
    ],
  });

  // Notify other admins
  socket.to('administrators').emit('admin:online', {
    adminId: userId,
    name: `${socket.user.firstName} ${socket.user.lastName}`,
  });

  // ==================== Event: Subscribe to System Metrics ====================
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

  // ==================== Event: Monitor User Activity ====================
  socket.on('user:monitor', (userId, callback) => {
    try {
      if (!userId) {
        const error = { success: false, message: 'User ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const monitorRoom = `monitor_user_${userId}`;
      socket.join(monitorRoom);

      logger.info(`Admin ${socket.user.id} monitoring user ${userId}`);

      if (callback) {
        callback({ success: true, message: `Monitoring user ${userId}` });
      }
    } catch (error) {
      logger.error('Error monitoring user:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to monitor user' });
      }
    }
  });

  // ==================== Event: Monitor Hotel ====================
  socket.on('hotel:monitor', (hotelId, callback) => {
    try {
      if (!hotelId) {
        const error = { success: false, message: 'Hotel ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const monitorRoom = `monitor_hotel_${hotelId}`;
      socket.join(monitorRoom);

      logger.info(`Admin ${userId} monitoring hotel ${hotelId}`);

      if (callback) {
        callback({ success: true, message: `Monitoring hotel ${hotelId}` });
      }
    } catch (error) {
      logger.error('Error monitoring hotel:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to monitor hotel' });
      }
    }
  });

  // ==================== Event: Global Broadcast ====================
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

      // Determine target
      if (targetNamespace) {
        // Broadcast to specific namespace
        const targetNs = namespace.server.of(targetNamespace);
        targetNs.emit('admin:broadcast', broadcastData);
        logger.info(
          `Admin ${userId} broadcasted to namespace ${targetNamespace}`
        );
      } else if (targetGroup) {
        // Broadcast to specific group across all namespaces
        namespace.server.emit('admin:broadcast', {
          ...broadcastData,
          targetGroup,
        });
        logger.info(`Admin ${userId} broadcasted to group ${targetGroup}`);
      } else {
        // Broadcast to all namespaces
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

  // ==================== Event: Manage User Session ====================
  socket.on('user:manageSession', (data, callback) => {
    try {
      const { userId, action } = data;

      if (!userId || !action) {
        const error = {
          success: false,
          message: 'User ID and action are required',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Actions: 'disconnect', 'suspend', 'restrict'
      const userRoom = `user_${userId}`;

      switch (action) {
        case 'disconnect':
          // Force disconnect user
          namespace.server.to(userRoom).emit('session:terminated', {
            reason: 'Administrative action',
            by: userId,
          });
          logger.info(
            `Admin ${socket.user.id} terminated session for user ${userId}`
          );
          break;

        case 'suspend':
          namespace.server.to(userRoom).emit('session:suspended', {
            reason: 'Account suspended',
            by: userId,
          });
          logger.info(`Admin ${socket.user.id} suspended user ${userId}`);
          break;

        case 'restrict':
          namespace.server.to(userRoom).emit('session:restricted', {
            reason: 'Account restricted',
            by: userId,
          });
          logger.info(`Admin ${socket.user.id} restricted user ${userId}`);
          break;

        default:
          throw new Error(`Invalid action: ${action}`);
      }

      if (callback) {
        callback({ success: true, message: `User ${action} action completed` });
      }
    } catch (error) {
      logger.error('Error managing user session:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to manage session' });
      }
    }
  });

  // ==================== Event: Get Platform Stats ====================
  socket.on('platform:getStats', async (callback) => {
    try {
      // Get real-time platform statistics
      const stats = await getPlatformStats(namespace.server);

      logger.info(`Admin ${userId} requested platform stats`);

      if (callback) {
        callback({
          success: true,
          stats,
        });
      }
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to get stats' });
      }
    }
  });

  // ==================== Event: Get Active Sessions ====================
  socket.on('sessions:getActive', async (callback) => {
    try {
      const sessions = await getActiveSessions(namespace.server);

      logger.info(`Admin ${userId} requested active sessions`);

      if (callback) {
        callback({
          success: true,
          sessions,
        });
      }
    } catch (error) {
      logger.error('Error getting active sessions:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to get active sessions' });
      }
    }
  });

  // ==================== Event: View Logs ====================
  socket.on('logs:subscribe', (options, callback) => {
    try {
      const { level, service } = options || {};

      socket.join('system_logs');

      logger.info(`Admin ${userId} subscribed to system logs`, {
        level,
        service,
      });

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

  // ==================== Event: Emergency Maintenance Mode ====================
  socket.on('system:maintenanceMode', (data, callback) => {
    try {
      const { enabled, message } = data;

      // Broadcast maintenance mode to all namespaces
      namespace.server.emit('system:maintenance', {
        enabled,
        message,
        activatedBy: userId,
        timestamp: new Date(),
      });

      logger.warn(
        `Admin ${userId} ${enabled ? 'enabled' : 'disabled'} maintenance mode`
      );

      if (callback) {
        callback({
          success: true,
          message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
        });
      }
    } catch (error) {
      logger.error('Error toggling maintenance mode:', error);
      if (callback) {
        callback({
          success: false,
          message: 'Failed to toggle maintenance mode',
        });
      }
    }
  });

  // ==================== Event: Disconnect ====================
  socket.on('disconnect', (reason) => {
    logger.info(`Admin disconnected from /admin namespace`, {
      userId,
      socketId: socket.id,
      reason,
    });

    // Notify other admins
    socket.to('administrators').emit('admin:offline', {
      adminId: userId,
      name: `${socket.user.firstName} ${socket.user.lastName}`,
    });
  });

  // ==================== Error Handling ====================
  socket.on('error', (error) => {
    logger.error('Socket error in /admin namespace:', { userId, error });
  });
};

/**
 * Helper: Get platform statistics
 */
async function getPlatformStats(io) {
  const namespaces = ['/public', '/user', '/property', '/support', '/admin'];
  const stats = {
    totalConnections: 0,
    byNamespace: {},
  };

  for (const nsName of namespaces) {
    const namespace = io.of(nsName);
    const sockets = await namespace.fetchSockets();
    const count = sockets.length;

    stats.byNamespace[nsName] = count;
    stats.totalConnections += count;
  }

  return stats;
}

/**
 * Helper: Get active sessions
 */
async function getActiveSessions(io) {
  const namespaces = ['/user', '/property', '/support', '/admin'];
  const sessions = [];

  for (const nsName of namespaces) {
    const namespace = io.of(nsName);
    const sockets = await namespace.fetchSockets();

    for (const socket of sockets) {
      if (socket.user) {
        sessions.push({
          namespace: nsName,
          userId: socket.user.id,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
          roles: socket.user.roles,
          socketId: socket.id,
        });
      }
    }
  }

  return sessions;
}

/**
 * Broadcast system alert to all administrators
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Object} alertData - Alert data
 */
exports.broadcastSystemAlert = (namespace, alertData) => {
  namespace.to('administrators').emit('system:alert', alertData);
  logger.warn('Broadcasted system alert to admins', alertData);
};

/**
 * Send system metrics update
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Object} metrics - Metrics data
 */
exports.sendMetricsUpdate = (namespace, metrics) => {
  namespace.to('system_metrics').emit('system:metricsUpdate', metrics);
};

/**
 * Send log entry to subscribing admins
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Object} logEntry - Log entry
 */
exports.sendLogEntry = (namespace, logEntry) => {
  namespace.to('system_logs').emit('logs:entry', logEntry);
};
