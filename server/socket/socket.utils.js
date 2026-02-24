const { logger } = require('@config/logger.config');

/**
 * Socket Utilities and Helper Functions
 * Common functionality for socket operations
 */

/**
 * Emit to multiple rooms
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string[]} rooms - Array of room names
 * @param {string} event - Event name
 * @param {*} data - Event data
 */
const emitToRooms = (namespace, rooms, event, data) => {
  rooms.forEach((room) => {
    namespace.to(room).emit(event, data);
  });
  logger.info(`Emitted ${event} to ${rooms.length} rooms`);
};

/**
 * Get all sockets in a room
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} roomName - Room name
 * @returns {Promise<Socket[]>} Array of sockets
 */
const getSocketsInRoom = async (namespace, roomName) => {
  const sockets = await namespace.in(roomName).fetchSockets();
  return sockets;
};

/**
 * Get socket count in a room
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} roomName - Room name
 * @returns {Promise<number>} Socket count
 */
const getSocketCountInRoom = async (namespace, roomName) => {
  const sockets = await getSocketsInRoom(namespace, roomName);
  return sockets.length;
};

/**
 * Disconnect all sockets for a user
 * @param {Server} io - Socket.IO server
 * @param {string} userId - User ID
 * @param {string} reason - Disconnect reason
 */
const disconnectUser = async (io, userId, reason = 'Administrative action') => {
  const namespaces = ['/user', '/property', '/support', '/admin'];

  for (const nsName of namespaces) {
    const namespace = io.of(nsName);
    const sockets = await namespace.in(`user_${userId}`).fetchSockets();

    for (const socket of sockets) {
      socket.emit('session:terminated', { reason });
      socket.disconnect(true);
      logger.info(`Disconnected socket ${socket.id} for user ${userId}`, { reason });
    }
  }
};

/**
 * Check if user is online
 * @param {Server} io - Socket.IO server
 * @param {string} userId - User ID
 * @param {string} namespace - Optional specific namespace to check
 * @returns {Promise<boolean>}
 */
const isUserOnline = async (io, userId, namespace = null) => {
  if (namespace) {
    const ns = io.of(namespace);
    const sockets = await ns.in(`user_${userId}`).fetchSockets();
    return sockets.length > 0;
  }

  // Check all authenticated namespaces
  const namespaces = ['/user', '/property', '/support', '/admin'];

  for (const nsName of namespaces) {
    const ns = io.of(nsName);
    const sockets = await ns.in(`user_${userId}`).fetchSockets();
    if (sockets.length > 0) {
      return true;
    }
  }

  return false;
};

/**
 * Get all online users in a namespace
 * @param {Namespace} namespace - Socket.IO namespace
 * @returns {Promise<Array>} Array of online users
 */
const getOnlineUsers = async (namespace) => {
  const sockets = await namespace.fetchSockets();
  const users = new Map();

  sockets.forEach((socket) => {
    if (socket.user && !users.has(socket.user.id)) {
      users.set(socket.user.id, {
        userId: socket.user.id,
        name: `${socket.user.firstName} ${socket.user.lastName}`,
        email: socket.user.email,
        roles: socket.user.roles,
      });
    }
  });

  return Array.from(users.values());
};

/**
 * Broadcast to all users with specific role
 * @param {Server} io - Socket.IO server
 * @param {string} role - Role name
 * @param {string} event - Event name
 * @param {*} data - Event data
 */
const broadcastToRole = async (io, role, event, data) => {
  const namespaces = ['/user', '/property', '/support', '/admin'];

  for (const nsName of namespaces) {
    const namespace = io.of(nsName);
    const sockets = await namespace.fetchSockets();

    sockets.forEach((socket) => {
      if (socket.user && socket.user.roles.includes(role)) {
        socket.emit(event, data);
      }
    });
  }

  logger.info(`Broadcasted ${event} to all users with role ${role}`);
};

/**
 * Send notification with acknowledgment
 * @param {Socket} socket - Socket instance
 * @param {string} event - Event name
 * @param {*} data - Event data
 * @param {number} timeout - Timeout in ms (default: 5000)
 * @returns {Promise<boolean>} Whether acknowledgment was received
 */
const emitWithAck = (socket, event, data, timeout = 5000) => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      logger.warn(`No acknowledgment received for ${event}`, {
        socketId: socket.id,
      });
      resolve(false);
    }, timeout);

    socket.emit(event, data, (ack) => {
      clearTimeout(timer);
      resolve(ack?.success || false);
    });
  });
};

/**
 * Rate limit socket events
 * @param {number} limit - Max events per window
 * @param {number} windowMs - Time window in ms
 * @returns {Function} Middleware function
 */
const createRateLimiter = (limit = 10, windowMs = 1000) => {
  const requests = new Map();

  return (socket, next) => {
    const socketId = socket.id;
    const now = Date.now();

    if (!requests.has(socketId)) {
      requests.set(socketId, []);
    }

    const socketRequests = requests.get(socketId);
    const recentRequests = socketRequests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= limit) {
      logger.warn(`Rate limit exceeded for socket ${socketId}`);
      return next(new Error('Rate limit exceeded'));
    }

    recentRequests.push(now);
    requests.set(socketId, recentRequests);

    // Cleanup old entries
    if (requests.size > 1000) {
      const oldestSocketId = requests.keys().next().value;
      requests.delete(oldestSocketId);
    }

    next();
  };
};

/**
 * Validate socket event data
 * @param {Object} schema - Validation schema (simple)
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
const validateEventData = (schema, data) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value !== undefined && value !== null) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
      }

      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Log socket event for debugging
 * @param {Socket} socket - Socket instance
 * @param {string} event - Event name
 * @param {*} data - Event data
 * @param {string} direction - 'incoming' or 'outgoing'
 */
const logSocketEvent = (socket, event, data, direction = 'incoming') => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Socket event ${direction}`, {
      socketId: socket.id,
      userId: socket.user?.id,
      namespace: socket.nsp.name,
      event,
      data: JSON.stringify(data).slice(0, 200), // Limit data size in logs
    });
  }
};

/**
 * Create standardized error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} Error response
 */
const createErrorResponse = (code, message, details = null) => {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
};

/**
 * Create standardized success response
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Success response
 */
const createSuccessResponse = (data = null, message = 'Success') => {
  return {
    success: true,
    message,
    ...(data && { data }),
  };
};

/**
 * Wrap socket event handler with error handling
 * @param {Function} handler - Event handler function
 * @returns {Function} Wrapped handler
 */
const wrapEventHandler = (handler) => {
  return async (...args) => {
    try {
      await handler(...args);
    } catch (error) {
      const callback = args[args.length - 1];
      logger.error('Socket event handler error:', error);

      if (typeof callback === 'function') {
        callback(createErrorResponse('HANDLER_ERROR', error.message));
      }
    }
  };
};

/**
 * Get namespace connection statistics
 * @param {Server} io - Socket.IO server
 * @returns {Promise<Object>} Connection statistics
 */
const getConnectionStats = async (io) => {
  const namespaces = ['/public', '/user', '/property', '/support', '/admin'];
  const stats = {
    total: 0,
    byNamespace: {},
    byRole: {},
  };

  for (const nsName of namespaces) {
    const namespace = io.of(nsName);
    const sockets = await namespace.fetchSockets();

    stats.byNamespace[nsName] = sockets.length;
    stats.total += sockets.length;

    // Count by role
    sockets.forEach((socket) => {
      if (socket.user && socket.user.roles) {
        socket.user.roles.forEach((role) => {
          stats.byRole[role] = (stats.byRole[role] || 0) + 1;
        });
      }
    });
  }

  return stats;
};

/**
 * Clean up disconnected sockets from a room
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} roomName - Room name
 */
const cleanupRoom = async (namespace, roomName) => {
  const sockets = await namespace.in(roomName).fetchSockets();

  sockets.forEach((socket) => {
    if (!socket.connected) {
      socket.leave(roomName);
      logger.info(`Removed disconnected socket ${socket.id} from room ${roomName}`);
    }
  });
};

module.exports = {
  emitToRooms,
  getSocketsInRoom,
  getSocketCountInRoom,
  disconnectUser,
  isUserOnline,
  getOnlineUsers,
  broadcastToRole,
  emitWithAck,
  createRateLimiter,
  validateEventData,
  logSocketEvent,
  createErrorResponse,
  createSuccessResponse,
  wrapEventHandler,
  getConnectionStats,
  cleanupRoom,
};
