const logger = require('@config/logger.config');

const { toMessageDto } = require('../application/serializers');
const { withAttachmentUrls } = require('../application/attachmentUrls');

/**
 * Best-effort realtime fanout for messaging.
 *
 * Persistence happens before this is called, so a failure here only means the
 * recipient sees the message on their next fetch - it never loses data.
 * `@platform/realtime` is required lazily to avoid a load-time cycle with the
 * namespace controllers that call back into this module.
 */
function realtime() {
  return require('@platform/realtime');
}

function messageRoom(conversationId) {
  return `conversation_${conversationId}`;
}

function deliver(event, room, payload, namespace) {
  try {
    const { getIO } = realtime();
    const io = getIO();

    if (!io) {
      return;
    }

    io.of(namespace).to(room).emit(event, payload);
  } catch (error) {
    logger.warn({ error: error.message, event, room, namespace }, 'Chat socket emit failed');
  }
}

/**
 * Emit a committed message to both participants' namespaces and raise the
 * recipient's unread badge.
 */
async function emitNewMessage({ conversation, message }) {
  const payload = await withAttachmentUrls(toMessageDto(message));
  if (!payload) {
    return;
  }

  const room = messageRoom(conversation.id);

  deliver('chat:message', room, payload, '/user');
  deliver('chat:message', room, payload, '/property');

  const activity = {
    conversationId: conversation.id,
    lastMessageSeq: payload.seq,
    lastMessagePreview: payload.body.slice(0, 160),
  };

  if (payload.senderSide !== 'guest') {
    deliver('chat:activity', `user_${conversation.guest_user_id}`, activity, '/user');
  }
  if (payload.senderSide !== 'hotel') {
    deliver('chat:activity', `hotel_${conversation.hotel_id}`, activity, '/property');
  }
}

function emitReadReceipt({ conversation, readerUserId, lastReadSeq }) {
  const payload = { conversationId: conversation.id, userId: readerUserId, lastReadSeq };

  const room = messageRoom(conversation.id);
  deliver('chat:read', room, payload, '/user');
  deliver('chat:read', room, payload, '/property');
}

module.exports = { emitNewMessage, emitReadReceipt, messageRoom };
