const redisClient = require('@config/redis.config');
const logger = require('@config/logger.config');
const { getNamespace } = require('@socket/index');
const userController = require('@socket/controllers/user.controller');
const { HOLD_EVENTS_CHANNEL } = require('./holdExpiry.publisher');

let subscriber;

async function startHoldExpirySubscriber() {
  if (subscriber) {
    return subscriber;
  }

  subscriber = redisClient.duplicate();

  subscriber.on('error', (error) => {
    logger.error('Hold expiry subscriber Redis error:', error);
  });

  await subscriber.connect();

  await subscriber.subscribe(HOLD_EVENTS_CHANNEL, (message) => {
    try {
      const event = JSON.parse(message);

      if (event.type !== 'hold:expired' || !event.userId || !event.holdId) {
        return;
      }

      const userNamespace = getNamespace('/user');
      userController.sendHoldExpired(userNamespace, event.userId, event);
    } catch (error) {
      logger.error('Failed to handle hold expiry event', {
        error: error.message,
        message,
      });
    }
  });

  logger.info('Hold expiry subscriber started');
  return subscriber;
}

async function stopHoldExpirySubscriber() {
  if (!subscriber) {
    return;
  }

  await subscriber.unsubscribe(HOLD_EVENTS_CHANNEL);
  await subscriber.quit();
  subscriber = null;
}

module.exports = {
  startHoldExpirySubscriber,
  stopHoldExpirySubscriber,
};
