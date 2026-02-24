const { Op } = require('sequelize');
const { Notifications, users } = require('../models/index.js');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  RELATED_ENTITY_TYPES,
  buildNotificationFromTemplate,
} = require('../constants/notifications');

/**
 * Notification Repository - Contains all database operations for notifications
 * Only repositories may import Sequelize models
 */

class NotificationRepository {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Notification>}
   */
  async create(notificationData) {
    return await Notifications.create(notificationData);
  }

  /**
   * Create notification from template
   * @param {string} receiverId - User ID receiving the notification
   * @param {string} notificationType - Type from NOTIFICATION_TYPES
   * @param {Object} templateData - Data for template substitution
   * @param {Object} options - Additional options (senderId, relatedEntity, etc.)
   */
  async createFromTemplate(
    receiverId,
    notificationType,
    templateData,
    options = {}
  ) {
    const notification = buildNotificationFromTemplate(
      notificationType,
      templateData
    );

    return await this.create({
      receiver_id: receiverId,
      sender_id: options.senderId || null,
      ...notification,
      related_entity_type: options.relatedEntityType || null,
      related_entity_id: options.relatedEntityId || null,
      expires_at: options.expiresAt || null,
    });
  }

  /**
   * Find all notifications for a user with filtering
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   */
  async findByUserId(userId, options = {}) {
    const {
      limit,
      offset,
      unreadOnly = false,
      category = null,
      type = null,
      priority = null,
      includeExpired = false,
    } = options;

    const where = {
      receiver_id: userId,
    };

    if (unreadOnly) {
      where.is_read = false;
    }

    if (category) {
      where.category = category;
    }

    if (type) {
      where.notification_type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    if (!includeExpired) {
      where[Op.or] = [
        { expires_at: null },
        { expires_at: { [Op.gt]: new Date() } },
      ];
    }

    return await Notifications.findAndCountAll({
      where,
      include: [
        {
          model: users,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false,
        },
      ],
      order: [
        ['priority', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: limit || undefined,
      offset: offset || undefined,
    });
  }

  /**
   * Find notification by ID with associations
   */
  async findById(notificationId, includeAssociations = true) {
    const queryOptions = {
      where: { id: notificationId },
    };

    if (includeAssociations) {
      queryOptions.include = [
        {
          model: users,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false,
        },
        {
          model: users,
          as: 'receiver',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false,
        },
      ];
    }

    return await Notifications.findOne(queryOptions);
  }

  /**
   * Find notifications by related entity
   */
  async findByRelatedEntity(entityType, entityId, options = {}) {
    const { limit, offset } = options;

    return await Notifications.findAndCountAll({
      where: {
        related_entity_type: entityType,
        related_entity_id: entityId,
      },
      order: [['created_at', 'DESC']],
      limit: limit || undefined,
      offset: offset || undefined,
    });
  }

  /**
   * Update notification by ID
   */
  async updateById(notificationId, updateData) {
    return await Notifications.update(updateData, {
      where: { id: notificationId },
    });
  }

  /**
   * Mark notification as read (uses model hook to set read_at)
   */
  async markAsReadById(notificationId) {
    const notification = await Notifications.findByPk(notificationId);
    if (notification) {
      return await notification.markAsRead();
    }
    return null;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsReadByUserId(userId) {
    return await Notifications.update(
      {
        is_read: true,
        read_at: new Date(),
      },
      {
        where: {
          receiver_id: userId,
          is_read: false,
        },
      }
    );
  }

  /**
   * Mark notification as sent
   */
  async markAsSentById(notificationId) {
    const notification = await Notifications.findByPk(notificationId);
    if (notification) {
      return await notification.markAsSent();
    }
    return null;
  }

  /**
   * Count unread notifications for a user
   */
  async countUnreadByUserId(userId, options = {}) {
    const { category = null } = options;

    const where = {
      receiver_id: userId,
      is_read: false,
    };

    if (category) {
      where.category = category;
    }

    return await Notifications.count({ where });
  }

  /**
   * Count notifications by category for a user
   */
  async countByCategory(userId) {
    const notifications = await Notifications.findAll({
      where: { receiver_id: userId, is_read: false },
      attributes: [
        'category',
        [
          Notifications.sequelize.fn(
            'COUNT',
            Notifications.sequelize.col('id')
          ),
          'count',
        ],
      ],
      group: ['category'],
    });

    return notifications.reduce((acc, item) => {
      acc[item.category] = parseInt(item.get('count'));
      return acc;
    }, {});
  }

  /**
   * Delete notification (soft delete)
   */
  async deleteById(notificationId) {
    return await Notifications.destroy({
      where: { id: notificationId },
    });
  }

  /**
   * Delete all expired notifications (hard delete)
   */
  async deleteExpired() {
    return await Notifications.destroy({
      where: {
        expires_at: {
          [Op.lt]: new Date(),
        },
      },
      force: true,
    });
  }

  /**
   * Delete old read notifications (cleanup)
   * @param {number} daysOld - Delete notifications older than X days
   */
  async deleteOldReadNotifications(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await Notifications.destroy({
      where: {
        is_read: true,
        read_at: {
          [Op.lt]: cutoffDate,
        },
      },
      force: true,
    });
  }

  /**
   * Get notification statistics for a user
   */
  async getStatistics(userId) {
    const [total, unread, byCategory] = await Promise.all([
      Notifications.count({ where: { receiver_id: userId } }),
      Notifications.count({ where: { receiver_id: userId, is_read: false } }),
      this.countByCategory(userId),
    ]);

    return {
      total,
      unread,
      read: total - unread,
      byCategory,
    };
  }
}

module.exports = new NotificationRepository();
