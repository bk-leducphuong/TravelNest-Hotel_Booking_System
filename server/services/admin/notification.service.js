const adminNotificationRepository = require('../../repositories/admin/notification.repository');
const ApiError = require('../../utils/ApiError');

/**
 * Admin Notification Service - Contains main business logic for admin notification management
 * Follows RESTful API standards
 */

class AdminNotificationService {
  /**
   * Verify hotel ownership for all operations
   */
  async verifyAccess(hotelId, ownerId) {
    const isOwner = await adminNotificationRepository.verifyHotelOwnership(hotelId, ownerId);

    if (!isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this hotel');
    }
  }

  /**
   * Get all notifications for a hotel
   * @param {number} hotelId - Hotel ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @param {Object} options - Query options
   * @param {boolean} options.isRead - Filter by read status
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @returns {Promise<Object>} Paginated notifications with metadata
   */
  async getNotifications(hotelId, ownerId, options = {}) {
    await this.verifyAccess(hotelId, ownerId);

    const result = await adminNotificationRepository.findByHotelId(hotelId, options);

    // Get unread count
    const unreadCount = await adminNotificationRepository.getUnreadCount(hotelId);

    const notifications = result.notifications.map((notification) =>
      notification.toJSON ? notification.toJSON() : notification
    );

    return {
      notifications,
      unreadCount,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: options.limit || 20,
      },
    };
  }

  /**
   * Get a specific notification by ID
   * @param {number} notificationId - Notification ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @returns {Promise<Object>} Notification details
   */
  async getNotificationById(notificationId, ownerId) {
    const notification = await adminNotificationRepository.findById(notificationId);

    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }

    // Verify hotel ownership
    await this.verifyAccess(notification.reciever_id, ownerId);

    return notification.toJSON ? notification.toJSON() : notification;
  }

  /**
   * Mark a notification as read
   * @param {number} notificationId - Notification ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @returns {Promise<Object>} Updated notification
   */
  async markNotificationAsRead(notificationId, ownerId) {
    const notification = await adminNotificationRepository.findById(notificationId);

    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }

    // Verify hotel ownership
    await this.verifyAccess(notification.reciever_id, ownerId);

    // Check if already read
    if (notification.is_read === 1) {
      return notification.toJSON ? notification.toJSON() : notification;
    }

    // Mark as read
    const [updatedCount] = await adminNotificationRepository.markAsRead(notificationId);

    if (updatedCount === 0) {
      throw new ApiError(500, 'UPDATE_FAILED', 'Failed to mark notification as read');
    }

    // Return updated notification
    return await this.getNotificationById(notificationId, ownerId);
  }

  /**
   * Mark all notifications as read for a hotel
   * @param {number} hotelId - Hotel ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @returns {Promise<Object>} Result with count of updated notifications
   */
  async markAllNotificationsAsRead(hotelId, ownerId) {
    await this.verifyAccess(hotelId, ownerId);

    const [updatedCount] = await adminNotificationRepository.markAllAsRead(hotelId);

    return {
      updatedCount,
      message: `Marked ${updatedCount} notification(s) as read`,
    };
  }

  /**
   * Delete a notification
   * @param {number} notificationId - Notification ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @returns {Promise<Object>} Deletion result
   */
  async deleteNotification(notificationId, ownerId) {
    const notification = await adminNotificationRepository.findById(notificationId);

    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }

    // Verify hotel ownership
    await this.verifyAccess(notification.reciever_id, ownerId);

    const deletedCount = await adminNotificationRepository.delete(notificationId);

    if (deletedCount === 0) {
      throw new ApiError(500, 'DELETE_FAILED', 'Failed to delete notification');
    }

    return {
      notificationId,
      message: 'Notification deleted successfully',
    };
  }
}

module.exports = new AdminNotificationService();
