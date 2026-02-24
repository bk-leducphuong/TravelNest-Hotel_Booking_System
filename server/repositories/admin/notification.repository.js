const { Op } = require('sequelize');

const { Notifications, Hotels } = require('../../models/index.js');

/**
 * Admin Notification Repository - Contains all database operations for admin notifications
 * Only repositories may import Sequelize models
 */

class AdminNotificationRepository {
  /**
   * Find all notifications for a hotel with optional filters
   */
  async findByHotelId(hotelId, options = {}) {
    const { isRead, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const where = {
      reciever_id: hotelId,
    };

    if (isRead !== undefined) {
      where.is_read = isRead ? 1 : 0;
    }

    const { count, rows } = await Notifications.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      notifications: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Find notification by ID
   */
  async findById(notificationId) {
    return await Notifications.findOne({
      where: { id: notificationId },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    return await Notifications.update(
      { is_read: 1 },
      {
        where: { id: notificationId },
      }
    );
  }

  /**
   * Mark all notifications as read for a hotel
   */
  async markAllAsRead(hotelId) {
    return await Notifications.update(
      { is_read: 1 },
      {
        where: {
          reciever_id: hotelId,
          is_read: 0,
        },
      }
    );
  }

  /**
   * Delete notification
   */
  async delete(notificationId) {
    return await Notifications.destroy({
      where: { id: notificationId },
    });
  }

  /**
   * Get unread notification count for a hotel
   */
  async getUnreadCount(hotelId) {
    return await Notifications.count({
      where: {
        reciever_id: hotelId,
        is_read: 0,
      },
    });
  }

  /**
   * Verify hotel ownership
   */
  async verifyHotelOwnership(hotelId, ownerId) {
    const hotel = await Hotels.findOne({
      where: {
        id: hotelId,
        owner_id: ownerId,
      },
    });
    return !!hotel;
  }

  /**
   * Verify notification belongs to hotel
   */
  async verifyNotificationOwnership(notificationId, hotelId) {
    const notification = await Notifications.findOne({
      where: {
        id: notificationId,
        reciever_id: hotelId,
      },
    });
    return !!notification;
  }

  /**
   * Create notification
   */
  async create(notificationData) {
    return await Notifications.create(notificationData);
  }
}

module.exports = new AdminNotificationRepository();
