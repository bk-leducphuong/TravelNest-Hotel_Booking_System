const logger = require('@config/logger.config');

const { getActiveSessions } = require('../stats');

/**
 * Session management events.
 */

function registerManageSession({ namespace, socket }) {
  socket.on('user:manageSession', (data, callback) => {
    try {
      const { userId, action } = data;

      if (!userId || !action) {
        const error = { success: false, message: 'User ID and action are required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const userRoom = `user_${userId}`;

      switch (action) {
        case 'disconnect':
          namespace.server.to(userRoom).emit('session:terminated', {
            reason: 'Administrative action',
            by: userId,
          });
          logger.info(`Admin ${socket.user.id} terminated session for user ${userId}`);
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
}

function registerGetActiveSessions({ namespace, socket, userId }) {
  socket.on('sessions:getActive', async (callback) => {
    try {
      const sessions = await getActiveSessions(namespace.server);

      logger.info(`Admin ${userId} requested active sessions`);

      if (callback) {
        callback({ success: true, sessions });
      }
    } catch (error) {
      logger.error('Error getting active sessions:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to get active sessions' });
      }
    }
  });
}

module.exports = { registerManageSession, registerGetActiveSessions };
