const redis = require('redis');
const logger = require('@config/logger.config');

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const connectTimeout = parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10);
const retryDelayMs = parseInt(process.env.REDIS_RETRY_DELAY_MS || '2000', 10);
const maxRetryDelayMs = parseInt(process.env.REDIS_MAX_RETRY_DELAY_MS || '10000', 10);

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    connectTimeout,
    // node-redis retries (re)connections itself. Back off up to maxRetryDelayMs
    // and never give up, so a Redis restart during API boot recovers on its own.
    reconnectStrategy: (retries) => Math.min((retries + 1) * retryDelayMs, maxRetryDelayMs),
  },
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
});

/**
 * node-redis emits `error` on every failed (re)connect attempt. With no
 * listener, Node re-throws on an `error` event, which aborts node-redis's
 * internal reconnect loop and leaves the socket in an "open" state — so every
 * later `connect()` throws `Socket already opened` and the client stays
 * disconnected forever. Handle it and let node-redis keep retrying.
 */
redisClient.on('error', (err) => {
  logger.error({ err: err && err.message }, 'Redis client error');
});

redisClient.on('ready', () => {
  logger.info('Redis connection successful');
});

/**
 * Start the initial connection exactly once.
 *
 * Do NOT loop/retry here: calling `connect()` on an already-open socket throws
 * `Socket already opened`. node-redis reconnects on its own (see
 * `reconnectStrategy`); this only kicks off the first attempt and, if that
 * attempt is abandoned, schedules a single follow-up.
 */
async function connect() {
  if (redisClient.isOpen) {
    return;
  }

  try {
    await redisClient.connect();
  } catch (err) {
    logger.warn({ err: err && err.message }, 'Redis initial connection failed; retrying');

    const timer = setTimeout(() => {
      if (!redisClient.isOpen) {
        connect();
      }
    }, retryDelayMs);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  }
}

connect();

module.exports = redisClient;
