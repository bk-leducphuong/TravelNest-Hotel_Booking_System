const ApiError = require('@utils/ApiError');
const sequelize = require('@config/database.config');

const { MAX_BODY_LENGTH, sendWindowDays } = require('../constants');
const { inspectMessage } = require('../domain/content-flags');
const { toMessageDto, buildPreview } = require('./serializers');
const conversationRepository = require('../infrastructure/conversation.repository');
const messageRepository = require('../infrastructure/message.repository');
const socketEmitter = require('../infrastructure/socket-emitter');

function conversationNotFound() {
  return new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
}

function validateBody(body) {
  const text = String(body ?? '').trim();

  if (!text) {
    throw new ApiError(400, 'MESSAGE_EMPTY', 'Message body is required.');
  }

  if (text.length > MAX_BODY_LENGTH) {
    throw new ApiError(
      400,
      'MESSAGE_TOO_LONG',
      `Message body must be at most ${MAX_BODY_LENGTH} characters.`
    );
  }

  return text;
}

/**
 * Guests can post until N days after check-out. Reading history is always
 * allowed; this only gates new messages, so dormant threads cannot be revived
 * years later.
 */
function assertWithinGuestSendWindow(conversation) {
  const checkOutDate = conversation.booking?.check_out_date;
  if (!checkOutDate) {
    return;
  }

  const deadline = new Date(`${checkOutDate}T23:59:59Z`);
  deadline.setUTCDate(deadline.getUTCDate() + sendWindowDays());

  if (Date.now() > deadline.getTime()) {
    throw new ApiError(
      409,
      'CONVERSATION_SEND_WINDOW_CLOSED',
      'This conversation is closed for new guest messages.'
    );
  }
}

/**
 * Single write path for text and system messages.
 *
 * The thread row is locked before the sequence is allocated, so concurrent sends
 * to the same conversation produce distinct, gap-free `seq` values without a
 * global counter.
 */
async function persistMessage({ conversation, senderSide, senderUserId, body, clientMessageId }) {
  const text = validateBody(body);

  if (conversation.status !== 'open') {
    throw new ApiError(409, 'CONVERSATION_CLOSED', 'This conversation is closed.');
  }

  if (clientMessageId) {
    const existing = await messageRepository.findByIdempotencyKey(conversation.id, clientMessageId);
    if (existing) {
      return { message: existing, created: false };
    }
  }

  const { flagged, reason } = inspectMessage(text);

  let message;

  try {
    message = await sequelize.transaction(async (transaction) => {
      const locked = await conversationRepository.findByIdForUpdate(conversation.id, transaction);

      if (!locked) {
        throw conversationNotFound();
      }

      if (locked.status !== 'open') {
        throw new ApiError(409, 'CONVERSATION_CLOSED', 'This conversation is closed.');
      }

      const seq = Number(locked.last_message_seq) + 1;
      const createdAt = new Date();

      const created = await messageRepository.create(
        {
          conversation_id: locked.id,
          seq,
          sender_user_id: senderSide === 'system' ? null : senderUserId || null,
          sender_side: senderSide,
          type: senderSide === 'system' ? 'system' : 'text',
          body: text,
          client_message_id: clientMessageId || null,
          flagged,
          flag_reason: reason,
          created_at: createdAt,
        },
        { transaction }
      );

      await conversationRepository.updateLastMessage(
        locked.id,
        { seq, preview: buildPreview(text), at: createdAt },
        { transaction }
      );

      return created;
    });
  } catch (error) {
    // A retry can lose the race to its own first attempt; return the winner.
    if (error.name === 'SequelizeUniqueConstraintError' && clientMessageId) {
      const existing = await messageRepository.findByIdempotencyKey(
        conversation.id,
        clientMessageId
      );
      if (existing) {
        return { message: existing, created: false };
      }
    }
    throw error;
  }

  return { message, created: true };
}

async function deliver({ conversation, message, created }) {
  if (!created) {
    return toMessageDto(message);
  }

  const withSender = await messageRepository.loadWithSender(message.id);
  socketEmitter.emitNewMessage({ conversation, message: withSender || message });

  return toMessageDto(withSender || message);
}

async function sendGuestMessage({ userId, conversationId, body, clientMessageId }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);

  if (!conversation || String(conversation.guest_user_id) !== String(userId)) {
    throw conversationNotFound();
  }

  assertWithinGuestSendWindow(conversation);

  const { message, created } = await persistMessage({
    conversation,
    senderSide: 'guest',
    senderUserId: userId,
    body,
    clientMessageId,
  });

  return deliver({ conversation, message, created });
}

async function sendHotelMessage({ hotelId, senderUserId, conversationId, body, clientMessageId }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);

  if (!conversation || String(conversation.hotel_id) !== String(hotelId)) {
    throw conversationNotFound();
  }

  const { message, created } = await persistMessage({
    conversation,
    senderSide: 'hotel',
    senderUserId,
    body,
    clientMessageId,
  });

  return deliver({ conversation, message, created });
}

module.exports = {
  sendGuestMessage,
  sendHotelMessage,
  persistMessage,
  validateBody,
  assertWithinGuestSendWindow,
};
