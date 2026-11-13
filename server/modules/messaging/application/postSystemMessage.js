const { persistMessage } = require('./sendMessage');
const conversationRepository = require('../infrastructure/conversation.repository');
const messageRepository = require('../infrastructure/message.repository');
const socketEmitter = require('../infrastructure/socket-emitter');
const { toMessageDto } = require('./serializers');

/**
 * Post a system line (booking confirmed / cancelled / completed).
 *
 * Booking events can be delivered more than once, so the same body in the same
 * thread is only written once.
 */
async function postSystemMessage({ conversationId, body }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);
  if (!conversation) {
    return null;
  }

  const text = String(body || '').trim();
  if (!text) {
    return null;
  }

  const alreadyPosted = await messageRepository.existsSystemMessage(conversation.id, text);
  if (alreadyPosted) {
    return null;
  }

  const { message, created } = await persistMessage({
    conversation,
    senderSide: 'system',
    senderUserId: null,
    body: text,
  });

  if (created) {
    await socketEmitter.emitNewMessage({ conversation, message });
  }

  return toMessageDto(message);
}

module.exports = { postSystemMessage };
