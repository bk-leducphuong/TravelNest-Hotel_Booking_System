const logger = require('@config/logger.config');
const redisClient = require('@config/redis.config');
const { v4: uuidv4 } = require('uuid');
const natsPublisher = require('@events/nats.publisher');

const DEFAULT_DEDUP_WINDOW_SECONDS = parseInt(
  process.env.HOTEL_VIEW_DEDUP_WINDOW_SECONDS || '600',
  10
);

class HotelViewEventService {
  /**
   * Deduplicate: same viewer + same hotel within window => one view.
   * @returns {Promise<boolean>} true if should count as a new view
   */
  async shouldCountView({ viewerKey, hotelId, windowSeconds = DEFAULT_DEDUP_WINDOW_SECONDS }) {
    const safeViewerKey = viewerKey || 'anonymous';
    const key = `view:${safeViewerKey}:${hotelId}`;

    // SET key 1 NX EX <ttl>
    const result = await redisClient.set(key, '1', {
      NX: true,
      EX: Math.max(1, windowSeconds),
    });

    return result === 'OK';
  }

  /**
   * Publish hotel view events for analytics.
   * @returns {Promise<{ eventId: string } | null>}
   */
  async publishHotelViewEvent({
    hotelId,
    userId = null,
    sessionId = '',
    ipAddress = '',
    userAgent = '',
    viewedAt = new Date(),
  }) {
    try {
      if (!hotelId) return null;

      const viewerKey = userId || sessionId || `${ipAddress}|${userAgent}`;
      const shouldCount = await this.shouldCountView({ viewerKey, hotelId });
      if (!shouldCount) return null;

      const event = {
        eventId: uuidv4(),
        hotelId,
        userId,
        sessionId,
        viewedAt,
        ipAddress,
        userAgent,
      };

      await natsPublisher.publish(
        'analytics.hotel.viewed.v1',
        {
          hotelId,
          userId,
          sessionId,
          ipAddress,
          userAgent,
        },
        { eventId: event.eventId, occurredAt: viewedAt }
      );

      return { eventId: event.eventId };
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack, hotelId, userId, sessionId },
        'Failed to publish hotel view event'
      );
      return null;
    }
  }
}

module.exports = new HotelViewEventService();
