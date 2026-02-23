const notificationRepository = require('../repositories/notification.repository');
const ApiError = require('../utils/ApiError');
const { logger } = require('../config/logger.config');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  RELATED_ENTITY_TYPES,
} = require('../constants/notifications');

/**
 * Notification Service - Contains main business logic
 * Follows RESTful API standards
 */

class NotificationService {
  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20, max: 100)
   * @param {boolean} options.unreadOnly - Only return unread notifications (default: false)
   * @param {string} options.category - Filter by category
   * @param {string} options.type - Filter by type
   * @returns {Promise<Object>} Notifications with pagination metadata
   */
  async getNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      category = null,
      type = null,
      priority = null,
    } = options;

    // Validate limit
    const validatedLimit = Math.min(limit, 100);
    const offset = (page - 1) * validatedLimit;

    const result = await notificationRepository.findByUserId(userId, {
      limit: validatedLimit,
      offset,
      unreadOnly,
      category,
      type,
      priority,
    });

    return {
      notifications: result.rows.map((notification) =>
        notification.toPublicJSON
          ? notification.toPublicJSON()
          : notification.toJSON()
      ),
      page,
      limit: validatedLimit,
      total: result.count,
    };
  }

  /**
   * Mark a specific notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for authorization check)
   * @returns {Promise<void>}
   */
  async markNotificationAsRead(notificationId, userId) {
    // Verify notification exists and belongs to user
    const notification = await notificationRepository.findById(
      notificationId,
      false
    );

    if (!notification) {
      throw new ApiError(
        404,
        'NOTIFICATION_NOT_FOUND',
        'Notification not found'
      );
    }

    if (notification.receiver_id !== userId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to mark this notification as read'
      );
    }

    // Mark as read using model method
    await notificationRepository.markAsReadById(notificationId);
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of notifications marked as read
   */
  async markAllNotificationsAsRead(userId) {
    const [updatedCount] =
      await notificationRepository.markAllAsReadByUserId(userId);
    return updatedCount;
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @returns {Promise<number|Object>} Count of unread notifications
   */
  async getUnreadCount(userId, options = {}) {
    const { byCategory = false } = options;

    if (byCategory) {
      return await notificationRepository.countByCategory(userId);
    }

    return await notificationRepository.countUnreadByUserId(userId);
  }

  /**
   * Get notification statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Notification statistics
   */
  async getStatistics(userId) {
    return await notificationRepository.getStatistics(userId);
  }

  // ==================== Socket Notification Methods ====================

  /**
   * Send new booking notification to hotel owner
   * @param {Object} data - Booking data
   */
  async sendNewBookingNotification(data) {
    const {
      buyerId,
      hotelId,
      bookingCode,
      bookingId,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      bookedRooms,
      totalAmount,
      guestName,
    } = data;

    try {
      // Get hotel with owner information
      const hotel = await this.getHotelWithOwner(hotelId);
      if (!hotel || !hotel.hotel_owner_id) {
        logger.warn(`Hotel ${hotelId} not found or has no owner`);
        return null;
      }

      // Create notification for hotel owner
      const notification = await notificationRepository.createFromTemplate(
        hotel.hotel_owner_id,
        NOTIFICATION_TYPES.BOOKING_NEW,
        {
          bookingCode,
          bookingId,
          guestName: guestName || 'Guest',
          numberOfGuests,
          checkInDate,
          checkOutDate,
          totalAmount,
        },
        {
          senderId: buyerId,
          relatedEntityType: RELATED_ENTITY_TYPES.BOOKING,
          relatedEntityId: bookingId,
        }
      );

      // Emit via Socket.IO to hotel owner
      await this.emitNotification(
        `owner_${hotel.hotel_owner_id}`,
        'booking:new',
        notification.toPublicJSON()
      );

      // Mark as sent
      await notificationRepository.markAsSentById(notification.id);

      // Also create notification for customer (booking confirmed)
      const customerNotification =
        await notificationRepository.createFromTemplate(
          buyerId,
          NOTIFICATION_TYPES.BOOKING_CONFIRMED,
          {
            bookingCode,
            bookingId,
            hotelName: hotel.name,
            checkInDate,
            checkOutDate,
            numberOfGuests,
          },
          {
            relatedEntityType: RELATED_ENTITY_TYPES.BOOKING,
            relatedEntityId: bookingId,
          }
        );

      // Emit to customer
      await this.emitNotification(
        `user_${buyerId}`,
        'booking:confirmed',
        customerNotification.toPublicJSON()
      );

      await notificationRepository.markAsSentById(customerNotification.id);

      return { ownerNotification: notification, customerNotification };
    } catch (error) {
      logger.error('Failed to send new booking notification:', error);
      throw error;
    }
  }

  /**
   * Send booking status update notification
   * @param {string} bookingId - Booking ID
   * @param {string} oldStatus - Old status
   * @param {string} newStatus - New status
   * @param {string} updatedBy - 'admin' or 'customer'
   */
  async sendBookingStatusUpdate(
    bookingId,
    oldStatus,
    newStatus,
    updatedBy = 'admin'
  ) {
    try {
      const booking = await this.getBookingDetails(bookingId);
      if (!booking) {
        logger.warn(`Booking ${bookingId} not found`);
        return null;
      }

      // Notify customer
      const customerNotification =
        await notificationRepository.createFromTemplate(
          booking.buyer_id,
          NOTIFICATION_TYPES.BOOKING_STATUS_UPDATE,
          {
            bookingCode: booking.booking_code,
            bookingId: booking.id,
            oldStatus,
            newStatus,
          },
          {
            relatedEntityType: RELATED_ENTITY_TYPES.BOOKING,
            relatedEntityId: bookingId,
          }
        );

      await this.emitNotification(
        `user_${booking.buyer_id}`,
        'booking:statusUpdate',
        customerNotification.toPublicJSON()
      );

      await notificationRepository.markAsSentById(customerNotification.id);

      // If updated by customer, notify hotel owner too
      if (updatedBy === 'customer') {
        const hotel = await this.getHotelWithOwner(booking.hotel_id);
        if (hotel?.hotel_owner_id) {
          const ownerNotification =
            await notificationRepository.createFromTemplate(
              hotel.hotel_owner_id,
              NOTIFICATION_TYPES.BOOKING_STATUS_UPDATE,
              {
                bookingCode: booking.booking_code,
                bookingId: booking.id,
                oldStatus,
                newStatus,
              },
              {
                senderId: booking.buyer_id,
                relatedEntityType: RELATED_ENTITY_TYPES.BOOKING,
                relatedEntityId: bookingId,
              }
            );

          await this.emitNotification(
            `owner_${hotel.hotel_owner_id}`,
            'booking:statusUpdate',
            ownerNotification.toPublicJSON()
          );

          await notificationRepository.markAsSentById(ownerNotification.id);
        }
      }

      return customerNotification;
    } catch (error) {
      logger.error('Failed to send status update:', error);
      throw error;
    }
  }

  /**
   * Send refund notification
   * @param {Object} data - Refund data
   */
  async sendRefundNotification(data) {
    const { buyerId, hotelId, bookingCode, bookingId, refundAmount } = data;

    try {
      // Notify customer
      const notification = await notificationRepository.createFromTemplate(
        buyerId,
        NOTIFICATION_TYPES.PAYMENT_REFUND,
        {
          bookingCode,
          bookingId,
          amount: refundAmount,
          currency: 'USD',
        },
        {
          relatedEntityType: RELATED_ENTITY_TYPES.REFUND,
          relatedEntityId: bookingId,
        }
      );

      await this.emitNotification(
        `user_${buyerId}`,
        'refund:processed',
        notification.toPublicJSON()
      );

      await notificationRepository.markAsSentById(notification.id);

      return notification;
    } catch (error) {
      logger.error('Failed to send refund notification:', error);
      throw error;
    }
  }

  /**
   * Send payout notification to hotel owner
   * @param {Object} data - Payout data
   */
  async sendPayoutNotification(data) {
    const { hotelId, transactionId, status, amount } = data;

    try {
      const hotel = await this.getHotelWithOwner(hotelId);
      if (!hotel?.hotel_owner_id) {
        logger.warn(`Hotel ${hotelId} not found or has no owner`);
        return null;
      }

      const notificationType =
        status === 'completed'
          ? NOTIFICATION_TYPES.PAYOUT_COMPLETED
          : NOTIFICATION_TYPES.PAYOUT_FAILED;

      const notification = await notificationRepository.createFromTemplate(
        hotel.hotel_owner_id,
        notificationType,
        {
          payoutId: transactionId,
          amount,
          currency: 'USD',
        },
        {
          relatedEntityType: RELATED_ENTITY_TYPES.TRANSACTION,
          relatedEntityId: transactionId,
        }
      );

      await this.emitNotification(
        `owner_${hotel.hotel_owner_id}`,
        'payout:update',
        notification.toPublicJSON()
      );

      await notificationRepository.markAsSentById(notification.id);

      return notification;
    } catch (error) {
      logger.error('Failed to send payout notification:', error);
      throw error;
    }
  }

  /**
   * Send review notification
   * @param {Object} data - Review data
   */
  async sendReviewNotification(data) {
    const { hotelId, reviewId, reviewerName, rating, reviewText } = data;

    try {
      const hotel = await this.getHotelWithOwner(hotelId);
      if (!hotel?.hotel_owner_id) {
        logger.warn(`Hotel ${hotelId} not found or has no owner`);
        return null;
      }

      const notification = await notificationRepository.createFromTemplate(
        hotel.hotel_owner_id,
        NOTIFICATION_TYPES.REVIEW_NEW,
        {
          reviewId,
          reviewerName,
          rating,
          reviewText,
        },
        {
          relatedEntityType: RELATED_ENTITY_TYPES.REVIEW,
          relatedEntityId: reviewId,
        }
      );

      await this.emitNotification(
        `owner_${hotel.hotel_owner_id}`,
        'review:new',
        notification.toPublicJSON()
      );

      await notificationRepository.markAsSentById(notification.id);

      return notification;
    } catch (error) {
      logger.error('Failed to send review notification:', error);
      throw error;
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Emit notification via Socket.IO
   * @param {string} room - Socket room name
   * @param {string} event - Event name
   * @param {Object} data - Notification data
   */
  async emitNotification(room, event, data) {
    try {
      const { getIO } = require('../socket/index');
      const io = getIO();

      io.to(room).emit(event, data, (acknowledgment) => {
        if (acknowledgment?.received) {
          logger.info(`Notification acknowledged by room ${room}`);
        } else {
          logger.warn(`Notification not acknowledged by room ${room}`);
        }
      });

      logger.info(`Emitted ${event} to room ${room}`);
    } catch (error) {
      logger.error(`Failed to emit notification to ${room}:`, error);
      // Don't throw - socket emission is non-critical
    }
  }

  /**
   * Get hotel with owner information
   * @param {string} hotelId - Hotel ID
   */
  async getHotelWithOwner(hotelId) {
    const { Hotels } = require('../models');
    return await Hotels.findByPk(hotelId, {
      attributes: ['id', 'name', 'hotel_owner_id'],
    });
  }

  /**
   * Get booking details
   * @param {string} bookingId - Booking ID
   */
  async getBookingDetails(bookingId) {
    const { Bookings } = require('../models');
    return await Bookings.findByPk(bookingId, {
      attributes: ['id', 'booking_code', 'buyer_id', 'hotel_id', 'status'],
    });
  }
}

module.exports = new NotificationService();
