const ApiError = require('@utils/ApiError');

const conversationRepository = require('../infrastructure/conversation.repository');
const readStateRepository = require('../infrastructure/read-state.repository');
const socketEmitter = require('../infrastructure/socket-emitter');

function conversationNotFound() {
  return new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
}

/**
 * Clamp to the thread's latest sequence: a stale or malicious client cannot
 * mark future messages as read.
 */
function clampSequence(lastSeq, conversation) {
  const requested = Number(lastSeq) || 0;
  const latest = Number(conversation.last_message_seq || 0);
  return Math.max(0, Math.min(requested, latest));
}

async function markRead({ conversation, userId, lastSeq }) {
  const seq = clampSequence(lastSeq, conversation);
  const state = await readStateRepository.upsertRead({
    conversationId: conversation.id,
    userId,
    lastSeq: seq,
  });

  const lastReadSeq = Number(state?.last_read_seq || seq);
  socketEmitter.emitReadReceipt({ conversation, readerUserId: userId, lastReadSeq });

  return { lastReadSeq };
}

async function markGuestConversationRead({ userId, conversationId, lastSeq }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);

  if (!conversation || String(conversation.guest_user_id) !== String(userId)) {
    throw conversationNotFound();
  }

  return markRead({ conversation, userId, lastSeq });
}

async function markHotelConversationRead({ hotelId, userId, conversationId, lastSeq }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);

  if (!conversation || String(conversation.hotel_id) !== String(hotelId)) {
    throw conversationNotFound();
  }

  return markRead({ conversation, userId, lastSeq });
}

module.exports = { markGuestConversationRead, markHotelConversationRead };
