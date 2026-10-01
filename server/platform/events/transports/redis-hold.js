const redisClient = require('@config/redis.config');
const logger = require('@config/logger.config');

const { HOLD_EVENTS } = require('../topics');

const CHANNEL = 'hold-events';
const TOPIC = HOLD_EVENTS.HOLD_EXPIRED;

/**
 * Redis transport adapter for socket-fanout events.
 *
 * Implements the same transport contract as the NATS adapter (`handles` /
 * `publish`, plus an inbound `subscribe`). Redis pub/sub is used instead of NATS
 * because these events are fire-and-forget notifications to a specific user's
 * socket room, produced by the worker process.
 */
const redisHoldTransport = {
  name: 'redis-hold',

  handles(topic) {
    return topic === TOPIC;
  },

  async ensureConnected() {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  },

  async publish(topic, envelope) {
    try {
      await this.ensureConnected();
      await redisClient.publish(CHANNEL, JSON.stringify(envelope));
      return { eventId: envelope.eventId, transport: this.name };
    } catch (error) {
      logger.error({ error: error.message, topic }, 'Failed to publish hold event');
      return null;
    }
  },

  async subscribe(topic, handler) {
    if (topic !== TOPIC) {
      return null;
    }

    try {
      await this.ensureConnected();

      const subscriber = redisClient.duplicate();
      subscriber.on('error', (error) => {
        logger.error({ error: error.message }, 'Hold expiry subscriber Redis error');
      });

      await subscriber.connect();
      await subscriber.subscribe(CHANNEL, (message) => {
        try {
          handler(JSON.parse(message));
        } catch (error) {
          logger.error({ error: error.message }, 'Failed to handle hold expiry event');
        }
      });

      logger.info('Hold expiry subscriber started');
      return subscriber;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to start hold expiry subscriber');
      return null;
    }
  },
};

module.exports = redisHoldTransport;
