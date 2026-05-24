const redisClient = require('@config/redis.config');
const logger = require('@config/logger.config');

const HOLD_EVENTS_CHANNEL = 'hold-events';

async function publishHoldExpired(payload) {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    await redisClient.publish(
      HOLD_EVENTS_CHANNEL,
      JSON.stringify({
        type: 'hold:expired',
        ...payload,
      })
    );
  } catch (error) {
    logger.error('Failed to publish hold expired event', {
      holdId: payload?.holdId,
      userId: payload?.userId,
      error: error.message,
    });
  }
}

module.exports = {
  HOLD_EVENTS_CHANNEL,
  publishHoldExpired,
};
