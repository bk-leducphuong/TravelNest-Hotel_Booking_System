const express = require('express');

const {
  authenticate,
  requirePermission,
  requireEntityInHotel,
} = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { writeLimiter } = require('@middlewares/rate-limitter.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./admin.schema');
const controller = require('./admin.controller');
const { getConversationHotelId } = require('../application/access');

const router = express.Router();

const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

// `/:conversationId*` carries no hotelId in the path, so assert the thread
// belongs to the caller's hotel context (closes the cross-hotel IDOR).
const conversationInHotel = requireEntityInHotel(async (req) =>
  getConversationHotelId(req.params.conversationId)
);

/**
 * Hotel-side conversation routes (mounted at /api/v1/admin/conversations).
 * Every route requires a bearer token and an explicit hotel permission.
 */
router.use(authenticate);

router.get(
  '/',
  requireHotelPermission(PERMISSIONS.CHAT_READ),
  validate(schema.listConversations),
  controller.listConversationsHandler
);

router.get(
  '/unread-count',
  requireHotelPermission(PERMISSIONS.CHAT_READ),
  validate(schema.unreadCount),
  controller.unreadCountHandler
);

router.get(
  '/:conversationId/messages',
  requireHotelPermission(PERMISSIONS.CHAT_READ),
  validate(schema.getMessages),
  conversationInHotel,
  controller.getMessagesHandler
);

router.post(
  '/:conversationId/messages',
  writeLimiter,
  requireHotelPermission(PERMISSIONS.CHAT_RESPOND),
  validate(schema.sendMessage),
  conversationInHotel,
  controller.sendMessageHandler
);

router.post(
  '/:conversationId/read',
  requireHotelPermission(PERMISSIONS.CHAT_READ),
  validate(schema.markRead),
  conversationInHotel,
  controller.markReadHandler
);

module.exports = router;
