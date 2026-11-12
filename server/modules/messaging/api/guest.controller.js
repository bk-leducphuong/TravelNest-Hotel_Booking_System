const ApiError = require('@utils/ApiError');

const { openConversationForGuest } = require('../application/ensureConversationForBooking');
const { listGuestConversations } = require('../application/listConversations');
const { getGuestMessages } = require('../application/getMessages');
const { sendGuestMessage } = require('../application/sendMessage');
const { markGuestConversationRead } = require('../application/markConversationRead');
const { getGuestUnreadCount } = require('../application/getUnreadCount');
const { toConversationDto } = require('../application/serializers');

/**
 * Guest messaging controller - HTTP mapping only.
 */

const listConversationsHandler = async (req, res) => {
  const result = await listGuestConversations({
    userId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
    unreadOnly: req.query.unreadOnly,
  });

  res.status(200).json({
    data: result.conversations,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
};

const openConversationHandler = async (req, res) => {
  const conversation = await openConversationForGuest({
    userId: req.user.id,
    bookingId: req.body.bookingId,
  });

  res.status(200).json({
    data: toConversationDto(conversation, { unreadCount: 0 }),
  });
};

const getMessagesHandler = async (req, res) => {
  const result = await getGuestMessages({
    userId: req.user.id,
    conversationId: req.params.conversationId,
    beforeSeq: req.query.beforeSeq,
    limit: req.query.limit,
  });

  if (!result) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
  }

  res.status(200).json({
    data: result.messages,
    meta: { hasMore: result.hasMore, latestSeq: result.latestSeq },
  });
};

const sendMessageHandler = async (req, res) => {
  const message = await sendGuestMessage({
    userId: req.user.id,
    conversationId: req.params.conversationId,
    body: req.body.body,
    clientMessageId: req.body.clientMessageId,
  });

  res.status(201).json({ data: message });
};

const markReadHandler = async (req, res) => {
  const result = await markGuestConversationRead({
    userId: req.user.id,
    conversationId: req.params.conversationId,
    lastSeq: req.body.lastSeq,
  });

  res.status(200).json({ data: result });
};

const unreadCountHandler = async (req, res) => {
  const result = await getGuestUnreadCount(req.user.id);
  res.status(200).json({ data: result });
};

module.exports = {
  listConversationsHandler,
  openConversationHandler,
  getMessagesHandler,
  sendMessageHandler,
  markReadHandler,
  unreadCountHandler,
};
