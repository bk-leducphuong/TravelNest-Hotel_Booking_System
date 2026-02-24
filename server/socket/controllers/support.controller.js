const logger = require('@config/logger.config');

/**
 * Support Namespace Controller (/support)
 * Handles connections from support agents
 * Features: ticket management, user assistance, chat support
 */

/**
 * Handle new connection to /support namespace
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Socket} socket - Socket instance
 */
exports.handleConnection = (namespace, socket) => {
  const userId = socket.user.id;

  logger.info(`Support agent connected to /support namespace`, {
    userId,
    socketId: socket.id,
  });

  // Join support agent room
  socket.join('support_agents');

  // Join agent's personal room
  const agentRoom = `support_agent_${userId}`;
  socket.join(agentRoom);

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to support namespace',
    agent: {
      id: userId,
      name: `${socket.user.firstName} ${socket.user.lastName}`,
    },
    features: ['ticket_management', 'live_chat', 'user_assistance', 'escalation_handling'],
  });

  // Broadcast to other agents that new agent is online
  socket.to('support_agents').emit('agent:online', {
    agentId: userId,
    name: `${socket.user.firstName} ${socket.user.lastName}`,
  });

  // ==================== Event: Join Support Chat ====================
  socket.on('support:joinChat', (ticketId, callback) => {
    try {
      if (!ticketId) {
        const error = { success: false, message: 'Ticket ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      const chatRoom = `support_chat_${ticketId}`;
      socket.join(chatRoom);

      logger.info(`Support agent ${userId} joined chat for ticket ${ticketId}`);

      // Notify user that agent joined
      socket.to(chatRoom).emit('support:agentJoined', {
        agentId: userId,
        agentName: `${socket.user.firstName} ${socket.user.lastName}`,
      });

      if (callback) {
        callback({ success: true, message: 'Joined support chat' });
      }
    } catch (error) {
      logger.error('Error joining support chat:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to join support chat' });
      }
    }
  });

  // ==================== Event: Send Support Message ====================
  socket.on('support:sendMessage', (data, callback) => {
    try {
      const { ticketId, message } = data;

      if (!ticketId || !message) {
        const error = {
          success: false,
          message: 'Ticket ID and message are required',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Broadcast to user and other agents in chat
      const chatRoom = `support_chat_${ticketId}`;
      namespace.to(chatRoom).emit('support:messageReceived', {
        ticketId,
        message,
        sender: {
          id: userId,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
          type: 'agent',
        },
        timestamp: new Date(),
      });

      logger.info(`Support agent ${userId} sent message for ticket ${ticketId}`);

      if (callback) {
        callback({ success: true, message: 'Message sent' });
      }
    } catch (error) {
      logger.error('Error sending support message:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to send message' });
      }
    }
  });

  // ==================== Event: Typing Indicator ====================
  socket.on('support:typing', (ticketId) => {
    const chatRoom = `support_chat_${ticketId}`;
    socket.to(chatRoom).emit('support:agentTyping', {
      agentId: userId,
      agentName: `${socket.user.firstName} ${socket.user.lastName}`,
    });
  });

  // ==================== Event: Assign Ticket ====================
  socket.on('ticket:assign', (data, callback) => {
    try {
      const { ticketId, assignToAgentId } = data;

      if (!ticketId || !assignToAgentId) {
        const error = {
          success: false,
          message: 'Ticket ID and agent ID are required',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Notify assigned agent
      const assignedAgentRoom = `support_agent_${assignToAgentId}`;
      namespace.to(assignedAgentRoom).emit('ticket:assigned', {
        ticketId,
        assignedBy: userId,
        assignedByName: `${socket.user.firstName} ${socket.user.lastName}`,
        timestamp: new Date(),
      });

      logger.info(`Ticket ${ticketId} assigned to agent ${assignToAgentId} by ${userId}`);

      if (callback) {
        callback({ success: true, message: 'Ticket assigned' });
      }
    } catch (error) {
      logger.error('Error assigning ticket:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to assign ticket' });
      }
    }
  });

  // ==================== Event: Update Ticket Status ====================
  socket.on('ticket:updateStatus', (data, callback) => {
    try {
      const { ticketId, status } = data;

      if (!ticketId || !status) {
        const error = {
          success: false,
          message: 'Ticket ID and status are required',
        };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Broadcast status update
      const chatRoom = `support_chat_${ticketId}`;
      namespace.to(chatRoom).emit('ticket:statusUpdated', {
        ticketId,
        status,
        updatedBy: userId,
        timestamp: new Date(),
      });

      logger.info(`Ticket ${ticketId} status updated to ${status} by agent ${userId}`);

      if (callback) {
        callback({ success: true, message: 'Ticket status updated' });
      }
    } catch (error) {
      logger.error('Error updating ticket status:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to update ticket status' });
      }
    }
  });

  // ==================== Event: Escalate Ticket ====================
  socket.on('ticket:escalate', (data, callback) => {
    try {
      const { ticketId, reason, priority } = data;

      if (!ticketId) {
        const error = { success: false, message: 'Ticket ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // Notify all support agents
      namespace.to('support_agents').emit('ticket:escalated', {
        ticketId,
        reason,
        priority,
        escalatedBy: userId,
        escalatedByName: `${socket.user.firstName} ${socket.user.lastName}`,
        timestamp: new Date(),
      });

      logger.info(`Ticket ${ticketId} escalated by agent ${userId}`, {
        reason,
        priority,
      });

      if (callback) {
        callback({ success: true, message: 'Ticket escalated' });
      }
    } catch (error) {
      logger.error('Error escalating ticket:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to escalate ticket' });
      }
    }
  });

  // ==================== Event: Get Online Agents ====================
  socket.on('agents:getOnline', (callback) => {
    try {
      const onlineAgents = getOnlineAgents(namespace);

      if (callback) {
        callback({
          success: true,
          agents: onlineAgents,
        });
      }
    } catch (error) {
      logger.error('Error getting online agents:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to get online agents' });
      }
    }
  });

  // ==================== Event: Request User Details ====================
  socket.on('user:getDetails', async (userId, callback) => {
    try {
      if (!userId) {
        const error = { success: false, message: 'User ID is required' };
        return callback ? callback(error) : socket.emit('error', error);
      }

      // This would call user service to get details
      // For now, just acknowledge
      logger.info(`Support agent ${socket.user.id} requested details for user ${userId}`);

      if (callback) {
        callback({
          success: true,
          message: 'User details request processed',
        });
      }
    } catch (error) {
      logger.error('Error getting user details:', error);
      if (callback) {
        callback({ success: false, message: 'Failed to get user details' });
      }
    }
  });

  // ==================== Event: Disconnect ====================
  socket.on('disconnect', (reason) => {
    logger.info(`Support agent disconnected from /support namespace`, {
      userId,
      socketId: socket.id,
      reason,
    });

    // Notify other agents that agent went offline
    socket.to('support_agents').emit('agent:offline', {
      agentId: userId,
      name: `${socket.user.firstName} ${socket.user.lastName}`,
    });
  });

  // ==================== Error Handling ====================
  socket.on('error', (error) => {
    logger.error('Socket error in /support namespace:', { userId, error });
  });
};

/**
 * Helper: Get online support agents
 */
function getOnlineAgents(namespace) {
  const agentsRoom = namespace.adapter.rooms.get('support_agents');
  if (!agentsRoom) return [];

  const onlineAgents = [];
  for (const socketId of agentsRoom) {
    const socket = namespace.sockets.get(socketId);
    if (socket && socket.user) {
      onlineAgents.push({
        agentId: socket.user.id,
        name: `${socket.user.firstName} ${socket.user.lastName}`,
        email: socket.user.email,
      });
    }
  }

  return onlineAgents;
}

/**
 * Notify all support agents of new ticket
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {Object} ticketData - Ticket data
 */
exports.notifyNewTicket = (namespace, ticketData) => {
  namespace.to('support_agents').emit('ticket:new', ticketData);
  logger.info(`Notified support agents of new ticket ${ticketData.ticketId}`);
};

/**
 * Send message to specific support chat
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} ticketId - Ticket ID
 * @param {Object} messageData - Message data
 */
exports.sendMessageToChat = (namespace, ticketId, messageData) => {
  const chatRoom = `support_chat_${ticketId}`;
  namespace.to(chatRoom).emit('support:messageReceived', messageData);
  logger.info(`Sent message to support chat ${ticketId}`);
};
