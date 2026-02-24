const { Server } = require('socket.io');
const logger = require('@config/logger.config');
const sessionMiddleware = require('@middlewares/session.middleware');
const { ROLES } = require('@constants/roles');

const { socketAuthentication, socketAuthorization, wrapMiddleware } = require('./socket.auth');

// Import namespace controllers
const publicController = require('./controllers/public.controller');
const userController = require('./controllers/user.controller');
const propertyController = require('./controllers/property.controller');
const supportController = require('./controllers/support.controller');
const adminController = require('./controllers/admin.controller');

let io;

/**
 * Initialize Socket.IO server with multiple namespaces
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
const initSocket = (server) => {
  // Initialize Socket.IO server
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_HOST || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: false, // Don't skip auth on reconnection
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  logger.info('Socket.IO server initialized');

  // ==================== /public Namespace ====================
  // For unauthenticated users (guests browsing the site)
  const publicNamespace = io.of('/public');

  publicNamespace.on('connection', (socket) => {
    logger.info(`Guest connected to /public`, { socketId: socket.id });
    publicController.handleConnection(publicNamespace, socket);
  });

  logger.info('Socket namespace /public configured for GUEST');

  // ==================== /user Namespace ====================
  // For authenticated regular users (customers)
  const userNamespace = io.of('/user');

  userNamespace.use(wrapMiddleware(sessionMiddleware));
  userNamespace.use(socketAuthentication);
  userNamespace.use(socketAuthorization([ROLES.USER, ROLES.ADMIN]));

  userNamespace.on('connection', (socket) => {
    logger.info(`User connected to /user`, {
      userId: socket.user.id,
      socketId: socket.id,
    });
    userController.handleConnection(userNamespace, socket);
  });

  logger.info('Socket namespace /user configured for USER');

  // ==================== /property Namespace ====================
  // For hotel owners, managers, and staff
  const propertyNamespace = io.of('/property');

  propertyNamespace.use(wrapMiddleware(sessionMiddleware));
  propertyNamespace.use(socketAuthentication);
  propertyNamespace.use(
    socketAuthorization([ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.ADMIN])
  );

  propertyNamespace.on('connection', (socket) => {
    logger.info(`Property user connected to /property`, {
      userId: socket.user.id,
      roles: socket.user.roles,
      socketId: socket.id,
    });
    propertyController.handleConnection(propertyNamespace, socket);
  });

  logger.info('Socket namespace /property configured for OWNER, MANAGER, STAFF');

  // ==================== /support Namespace ====================
  // For support agents
  const supportNamespace = io.of('/support');

  supportNamespace.use(wrapMiddleware(sessionMiddleware));
  supportNamespace.use(socketAuthentication);
  supportNamespace.use(socketAuthorization([ROLES.SUPPORT_AGENT, ROLES.ADMIN]));

  supportNamespace.on('connection', (socket) => {
    logger.info(`Support agent connected to /support`, {
      userId: socket.user.id,
      socketId: socket.id,
    });
    supportController.handleConnection(supportNamespace, socket);
  });

  logger.info('Socket namespace /support configured for SUPPORT_AGENT');

  // ==================== /admin Namespace ====================
  // For platform administrators
  const adminNamespace = io.of('/admin');

  adminNamespace.use(wrapMiddleware(sessionMiddleware));
  adminNamespace.use(socketAuthentication);
  adminNamespace.use(socketAuthorization([ROLES.ADMIN]));

  adminNamespace.on('connection', (socket) => {
    logger.info(`Admin connected to /admin`, {
      userId: socket.user.id,
      socketId: socket.id,
    });
    adminController.handleConnection(adminNamespace, socket);
  });

  logger.info('Socket namespace /admin configured for ADMIN');

  // ==================== Global Error Handling ====================
  io.on('error', (error) => {
    logger.error('Socket.IO server error:', error);
  });

  logger.info(
    'Socket.IO server ready with 5 namespaces: /public, /user, /property, /support, /admin'
  );

  return io;
};

/**
 * Get Socket.IO server instance
 * @returns {Server} Socket.IO server instance
 * @throws {Error} If Socket.IO is not initialized
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized! Call initSocket() first.');
  }
  return io;
};

/**
 * Get specific namespace
 * @param {string} namespaceName - Namespace name (e.g., '/user', '/property')
 * @returns {Namespace} Socket.IO namespace
 */
const getNamespace = (namespaceName) => {
  const io = getIO();
  return io.of(namespaceName);
};

/**
 * Emit event to all sockets in a namespace
 * @param {string} namespaceName - Namespace name
 * @param {string} event - Event name
 * @param {*} data - Event data
 */
const emitToNamespace = (namespaceName, event, data) => {
  try {
    const namespace = getNamespace(namespaceName);
    namespace.emit(event, data);
    logger.info(`Emitted ${event} to namespace ${namespaceName}`);
  } catch (error) {
    logger.error(`Failed to emit to namespace ${namespaceName}:`, error);
  }
};

/**
 * Emit event to specific user across all their socket connections
 * @param {string} userId - User ID
 * @param {string} namespaceName - Namespace name
 * @param {string} event - Event name
 * @param {*} data - Event data
 */
const emitToUser = (userId, namespaceName, event, data) => {
  try {
    const namespace = getNamespace(namespaceName);
    const room = `user_${userId}`;
    namespace.to(room).emit(event, data);
    logger.info(`Emitted ${event} to user ${userId} in namespace ${namespaceName}`);
  } catch (error) {
    logger.error(`Failed to emit to user ${userId}:`, error);
  }
};

/**
 * Emit event to specific hotel room
 * @param {string} hotelId - Hotel ID
 * @param {string} event - Event name
 * @param {*} data - Event data
 */
const emitToHotel = (hotelId, event, data) => {
  try {
    const propertyNamespace = getNamespace('/property');
    const room = `hotel_${hotelId}`;
    propertyNamespace.to(room).emit(event, data);
    logger.info(`Emitted ${event} to hotel ${hotelId}`);
  } catch (error) {
    logger.error(`Failed to emit to hotel ${hotelId}:`, error);
  }
};

/**
 * Get all connected sockets count
 * @returns {Object} Socket counts by namespace
 */
const getSocketStats = async () => {
  try {
    const io = getIO();
    const namespaces = ['/public', '/user', '/property', '/support', '/admin'];

    const stats = {};

    for (const nsName of namespaces) {
      const namespace = io.of(nsName);
      const sockets = await namespace.fetchSockets();
      stats[nsName] = sockets.length;
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get socket stats:', error);
    return {};
  }
};

module.exports = {
  initSocket,
  getIO,
  getNamespace,
  emitToNamespace,
  emitToUser,
  emitToHotel,
  getSocketStats,
};
