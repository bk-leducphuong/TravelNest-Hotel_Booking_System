const { DEFAULT_MESSAGE_PAGE_SIZE } = require('../constants');
const { toMessageDto } = require('./serializers');
const { withAttachmentUrls } = require('./attachmentUrls');
const conversationRepository = require('../infrastructure/conversation.repository');
const messageRepository = require('../infrastructure/message.repository');

async function listMessages(conversation, { beforeSeq, limit }) {
  const pageSize = limit || DEFAULT_MESSAGE_PAGE_SIZE;
  const { messages, hasMore } = await messageRepository.listPage({
    conversationId: conversation.id,
    beforeSeq: beforeSeq || null,
    limit: pageSize,
  });

  return {
    conversationId: conversation.id,
    messages: await Promise.all(
      messages.map((message) => withAttachmentUrls(toMessageDto(message)))
    ),
    hasMore,
    latestSeq: Number(conversation.last_message_seq || 0),
  };
}

async function getGuestMessages({ userId, conversationId, beforeSeq, limit }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);

  if (!conversation || String(conversation.guest_user_id) !== String(userId)) {
    return null;
  }

  return listMessages(conversation, { beforeSeq, limit });
}

async function getHotelMessages({ hotelId, conversationId, beforeSeq, limit }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);

  if (!conversation || String(conversation.hotel_id) !== String(hotelId)) {
    return null;
  }

  return listMessages(conversation, { beforeSeq, limit });
}

module.exports = { getGuestMessages, getHotelMessages, listMessages };
