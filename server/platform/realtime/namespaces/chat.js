const logger = require('@config/logger.config');

/**
 * Chat socket handlers, shared by the `/user` (guest) and `/property`
 * (owner/staff) namespaces.
 *
 * The socket only delivers. Sending a message is an HTTP write so it survives
 * disconnects; this layer just lets a participant subscribe to a thread and
 * broadcast typing state.
 *
 * `@modules/messaging` is required lazily: the module's socket emitter reaches
 * back into `@platform/realtime`, so a top-level require would create a cycle.
 */
function messagingModule() {
  return require('@modules/messaging');
}

function reply(callback, socket, payload) {
  if (typeof callback === 'function') {
    callback(payload);
    return;
  }
  socket.emit('chat:error', payload);
}

function conversationRoom(conversationId) {
  return `conversation_${conversationId}`;
}

/**
 * @param {object} params
 * @param {import('socket.io').Namespace} params.namespace
 * @param {import('socket.io').Socket} params.socket
 * @param {string} params.userId
 * @param {string[]} [params.hotelIds] hotels the user has a role in
 */
function registerChatHandlers({ namespace, socket, userId, hotelIds = [] }) {
  socket.on('chat:join', async (payload = {}, callback) => {
    try {
      const { conversationId } = payload || {};

      if (!conversationId) {
        return reply(callback, socket, { success: false, message: 'conversationId is required' });
      }

      const access = await messagingModule().resolveConversationAccess({
        conversationId,
        userId,
        hotelIds,
      });

      if (!access) {
        // Never confirm whether the thread exists to a non-participant.
        return reply(callback, socket, { success: false, message: 'Conversation not found' });
      }

      socket.join(conversationRoom(conversationId));

      logger.debug({ userId, conversationId, side: access.side }, 'Socket joined chat room');

      return reply(callback, socket, {
        success: true,
        conversationId,
        side: access.side,
        latestSeq: Number(access.conversation.last_message_seq || 0),
      });
    } catch (error) {
      logger.error({ error: error.message, userId }, 'chat:join failed');
      return reply(callback, socket, { success: false, message: 'Could not open conversation' });
    }
  });

  socket.on('chat:leave', (payload = {}) => {
    const { conversationId } = payload || {};
    if (conversationId) {
      socket.leave(conversationRoom(conversationId));
    }
  });

  socket.on('chat:typing', async (payload = {}) => {
    try {
      const { conversationId } = payload || {};
      if (!conversationId) {
        return;
      }

      const access = await messagingModule().resolveConversationAccess({
        conversationId,
        userId,
        hotelIds,
      });

      if (!access) {
        return;
      }

      socket.to(conversationRoom(conversationId)).emit('chat:typing', {
        conversationId,
        userId,
        side: access.side,
        at: Date.now(),
      });
    } catch (error) {
      logger.debug({ error: error.message, userId }, 'chat:typing ignored');
    }
  });

  // Keeps the namespace reference intentional: handlers are registered on the
  // socket, and room broadcasts happen through it.
  void namespace;
}

module.exports = { registerChatHandlers, conversationRoom };
