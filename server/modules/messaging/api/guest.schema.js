const Joi = require('joi');

const { DEFAULT_PAGE_SIZE, DEFAULT_MESSAGE_PAGE_SIZE } = require('../constants');

/**
 * Guest messaging schemas (mounted at /api/v1/conversations).
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(DEFAULT_PAGE_SIZE),
};

const conversationParams = Joi.object({ conversationId: uuid.required() }).required();

const listConversations = {
  query: Joi.object({
    ...pagination,
    unreadOnly: Joi.boolean().default(false),
  }).unknown(false),
};

const openConversation = {
  body: Joi.object({
    bookingId: uuid.required(),
  }).required(),
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
    // the documented MESSAGE_EMPTY / MESSAGE_TOO_LONG error codes.
    body: Joi.string().required(),
    clientMessageId: uuid,
  }).required(),
};

const markRead = {
  params: conversationParams,
  body: Joi.object({
    lastSeq: Joi.number().integer().min(0).required(),
  }).required(),
};

const unreadCount = {
  query: Joi.object({}).unknown(false),
};

module.exports = {
  listConversations,
  openConversation,
  getMessages,
  sendMessage,
  markRead,
  unreadCount,
  conversationParams,
};
