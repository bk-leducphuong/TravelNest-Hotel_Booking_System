const ApiError = require('@utils/ApiError');

const conversationRepository = require('../infrastructure/conversation.repository');
const socketEmitter = require('../infrastructure/socket-emitter');

/**
 * Guest-side "delete": hide the thread from the guest's inbox.
 *
 * The thread is soft-deleted so the hotel keeps the conversation and the guest
 * can restore it by opening the booking again. Access is checked before the
 * write so another user's id cannot hide a thread or probe which ids exist.
 */
async function deleteConversationForGuest({ userId, conversationId }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);

  if (!conversation || String(conversation.guest_user_id) !== String(userId)) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
  }

  const affected = await conversationRepository.hideForGuest(conversationId, userId);

  if (!affected) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
  }

  // Let any open inbox tab drop the row and refresh the unread badge.
  socketEmitter.emitConversationDeleted({ conversation, guestUserId: userId });

  return { conversationId, deleted: true };
}

module.exports = { deleteConversationForGuest };
