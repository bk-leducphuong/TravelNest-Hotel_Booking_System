const ApiError = require('@utils/ApiError');

const { listHotelConversations } = require('../application/listConversations');
const { getHotelMessages } = require('../application/getMessages');
const { sendHotelMessage } = require('../application/sendMessage');
const { markHotelConversationRead } = require('../application/markConversationRead');
const { getHotelUnreadCount } = require('../application/getUnreadCount');
const { uploadHotelAttachments } = require('../application/uploadAttachments');

/**
 * Hotel-side messaging controller.
 *
 * `req.hotelContext` is populated by requirePermission and is the only trusted
 * source of the active hotel; the query/body `hotelId` is a platform-staff
 * convenience handled by the same middleware.
 */

function activeHotelId(req) {
  return req.hotelContext?.hotelId || req.query.hotelId || req.body?.hotelId;
}

/**
 * Platform staff can reach these routes without a hotel context (the permission
 * middleware allows it). Every query here is hotel-scoped, so fail loudly
 * instead of running an unscoped count.
 */
function requireActiveHotelId(req) {
  const hotelId = activeHotelId(req);
  if (!hotelId) {
    throw new ApiError(400, 'HOTEL_CONTEXT_REQUIRED', 'A hotel context is required.');
  }
  return hotelId;
}

const listConversationsHandler = async (req, res) => {
  const hotelId = requireActiveHotelId(req);

  const result = await listHotelConversations({
    hotelId,
    readerUserId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
    unreadOnly: req.query.unreadOnly,
  });

  res.status(200).json({
    data: result.conversations,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
};

const getMessagesHandler = async (req, res) => {
  const result = await getHotelMessages({
    hotelId: requireActiveHotelId(req),
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
  const message = await sendHotelMessage({
    hotelId: requireActiveHotelId(req),
    senderUserId: req.user.id,
    conversationId: req.params.conversationId,
    body: req.body.body,
    clientMessageId: req.body.clientMessageId,
    attachmentKeys: req.body.attachmentKeys,
  });

  res.status(201).json({ data: message });
};

const uploadAttachmentsHandler = async (req, res) => {
  const attachments = await uploadHotelAttachments({
    hotelId: requireActiveHotelId(req),
    senderUserId: req.user.id,
    conversationId: req.params.conversationId,
    files: req.files || [],
  });

  res.status(201).json({ data: attachments });
};

const markReadHandler = async (req, res) => {
  const result = await markHotelConversationRead({
    hotelId: requireActiveHotelId(req),
    userId: req.user.id,
    conversationId: req.params.conversationId,
    lastSeq: req.body.lastSeq,
  });

  res.status(200).json({ data: result });
};

const unreadCountHandler = async (req, res) => {
  const result = await getHotelUnreadCount({
    hotelId: requireActiveHotelId(req),
    readerUserId: req.user.id,
  });

  res.status(200).json({ data: result });
};

module.exports = {
  listConversationsHandler,
  getMessagesHandler,
  sendMessageHandler,
  uploadAttachmentsHandler,
  markReadHandler,
  unreadCountHandler,
};
