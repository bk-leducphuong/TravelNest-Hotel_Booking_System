const Joi = require('joi');

const { pagination } = require('./common.schema');

/**
 * Notification validation schemas
 * Following RESTful API standards
 */

// Common validations
const notificationIdSchema = Joi.string().uuid().required().messages({
  'string.base': 'notificationId must be a string',
  'string.guid': 'notificationId must be a valid UUID',
  'any.required': 'notificationId is required',
});

/**
 * GET /api/notifications
 * Get notifications for authenticated user
 */
exports.getNotifications = {
  query: Joi.object({
    ...pagination,
    unreadOnly: Joi.boolean().default(false).messages({
      'boolean.base': 'unreadOnly must be a boolean',
    }),
  }),
};

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
exports.getUnreadCount = {
  query: Joi.object({}).unknown(false), // No query params expected
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
exports.markAllNotificationsAsRead = {
  body: Joi.object({}).unknown(false), // No body expected
};

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a specific notification as read
 */
exports.markNotificationAsRead = {
  params: Joi.object({
    notificationId: notificationIdSchema,
  }).required(),
  body: Joi.object({}).unknown(false), // No body expected
};
