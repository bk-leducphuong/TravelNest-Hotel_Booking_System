const logger = require('@config/logger.config');

const { registerSubscribeMetrics, registerMaintenanceMode } = require('./handlers/metrics');
const { registerMonitorUser, registerMonitorHotel } = require('./handlers/monitoring');
const { registerBroadcastGlobal } = require('./handlers/broadcast');
const { registerManageSession, registerGetActiveSessions } = require('./handlers/sessions');
const { registerGetPlatformStats, registerSubscribeLogs } = require('./handlers/stats');
const { registerDisconnect, registerError } = require('./handlers/lifecycle');

/**
 * Handle new connection to the /admin namespace: join rooms, send the welcome
 * payload, and register the event handlers.
 *
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Socket} socket - Socket instance
 */
function handleConnection(namespace, socket) {
  const userId = socket.user.id;

  logger.info(`Admin connected to /admin namespace`, { userId, socketId: socket.id });

  // Join admin room
  socket.join('administrators');

  // Join admin's personal room
  socket.join(`admin_${userId}`);

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

  const context = { namespace, socket, userId };

  registerSubscribeMetrics(context);
  registerMonitorUser(context);
  registerMonitorHotel(context);
  registerBroadcastGlobal(context);
  registerManageSession(context);
  registerGetPlatformStats(context);
  registerGetActiveSessions(context);
  registerSubscribeLogs(context);
  registerMaintenanceMode(context);
  registerDisconnect(context);
  registerError(context);
}

module.exports = { handleConnection };
