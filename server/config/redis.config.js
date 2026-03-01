const redis = require('redis');
const logger = require('@config/logger.config');

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const connectTimeout = parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10);
const retryAttempts = parseInt(process.env.REDIS_RETRY_ATTEMPTS || '10', 10);
const retryDelayMs = parseInt(process.env.REDIS_RETRY_DELAY_MS || '2000', 10);

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    connectTimeout,
  },
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
});

/**
 * Connect to Redis with retries (e.g. when Redis container starts after the API in Docker).
 */
async function connectWithRetry(attempt = 1) {
  try {
    await redisClient.connect();
    logger.info('Redis connection successful');
  } catch (err) {
    logger.warn(
      { err: err.message, attempt, maxAttempts: retryAttempts },
      'Redis connection failed'
    );
    if (attempt >= retryAttempts) {
      logger.error(err, 'Redis connection error - gave up after retries');
      return;
    }
    await new Promise((r) => setTimeout(r, retryDelayMs));
    await connectWithRetry(attempt + 1);
  }
}

connectWithRetry();

module.exports = redisClient;
