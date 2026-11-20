const Joi = require('joi');

const { DEFAULT_PAGE_SIZE, DEFAULT_MESSAGE_PAGE_SIZE, MAX_ATTACHMENTS } = require('../constants');

/**
 * Hotel-side messaging schemas (mounted at /api/v1/admin/conversations).
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });

const conversationParams = Joi.object({ conversationId: uuid.required() }).required();
const uploadAttachments = { params: conversationParams };

const listConversations = {
  query: Joi.object({
    hotelId: uuid,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(DEFAULT_PAGE_SIZE),
    unreadOnly: Joi.boolean().default(false),
  }).unknown(false),
};

const getMessages = {
  params: conversationParams,
  query: Joi.object({
    beforeSeq: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100).default(DEFAULT_MESSAGE_PAGE_SIZE),
  }).unknown(false),
};

const sendMessage = {
  params: conversationParams,
  body: Joi.object({
    // Emptiness and length are validated in the service so the API can return
    // the documented MESSAGE_EMPTY / MESSAGE_TOO_LONG error codes. A body may
    // be omitted when images are attached.
    body: Joi.string().allow('').default(''),
    clientMessageId: uuid,
    attachmentKeys: Joi.array().items(Joi.string().trim()).max(MAX_ATTACHMENTS).default([]),
  }).required(),
};

const markRead = {
  params: conversationParams,
  body: Joi.object({
    lastSeq: Joi.number().integer().min(0).required(),
  }).required(),
};

const unreadCount = {
  query: Joi.object({ hotelId: uuid }).unknown(false),
};

module.exports = {
  listConversations,
  getMessages,
  sendMessage,
  markRead,
  unreadCount,
  conversationParams,
  uploadAttachments,
};
