const logger = require('@config/logger.config');
const notificationRepository = require('@repositories/notification.repository');
const { NOTIFICATION_TYPES, RELATED_ENTITY_TYPES } = require('@constants/notifications');

const { getHotelWithOwner } = require('../infrastructure/lookups');
const { emitNotification } = require('../infrastructure/socket-emitter');

/**
 * Create and emit a payout notification for a hotel owner.
 */
async function sendPayoutNotification(data) {
  const { hotelId, ownerId, payoutId, transactionId, status, amount } = data;
  const relatedPayoutId = payoutId || transactionId;

  try {
    const hotel = ownerId ? null : await getHotelWithOwner(hotelId);
    const receiverId = ownerId || hotel?.hotel_owner_id;

    if (!receiverId) {
      logger.warn(`Hotel ${hotelId} not found or has no owner`);
      return null;
    }

    const notificationType =
      status === 'completed'
        ? NOTIFICATION_TYPES.PAYOUT_COMPLETED
        : NOTIFICATION_TYPES.PAYOUT_FAILED;

    const notification = await notificationRepository.createFromTemplate(
      receiverId,
      notificationType,
      {
        payoutId: relatedPayoutId,
        amount,
        currency: 'USD',
      },
      {
        relatedEntityType: RELATED_ENTITY_TYPES.PAYOUT,
        relatedEntityId: relatedPayoutId,
      }
    );

    await emitNotification(`owner_${receiverId}`, 'payout:update', notification.toPublicJSON());

    await notificationRepository.markAsSentById(notification.id);

    return notification;
  } catch (error) {
    logger.error('Failed to send payout notification:', error);
    throw error;
  }
}

module.exports = { sendPayoutNotification };
