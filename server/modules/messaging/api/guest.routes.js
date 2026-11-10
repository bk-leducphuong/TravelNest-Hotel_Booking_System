const express = require('express');

const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { writeLimiter } = require('@middlewares/rate-limitter.middleware');

const schema = require('./guest.schema');
const controller = require('./guest.controller');

const router = express.Router();

/**
 * Guest conversation routes (mounted at /api/v1/conversations).
 * Every route is scoped to the authenticated user inside the application layer.
 */
router.use(authenticate);

router.get('/', validate(schema.listConversations), controller.listConversationsHandler);

router.post(
  '/',
  writeLimiter,
  validate(schema.openConversation),
  controller.openConversationHandler
);

router.get('/unread-count', validate(schema.unreadCount), controller.unreadCountHandler);

router.get(
  '/:conversationId/messages',
  validate(schema.getMessages),
  controller.getMessagesHandler
);

router.post(
  '/:conversationId/messages',
  writeLimiter,
  validate(schema.sendMessage),
  controller.sendMessageHandler
);

router.post('/:conversationId/read', validate(schema.markRead), controller.markReadHandler);

module.exports = router;
