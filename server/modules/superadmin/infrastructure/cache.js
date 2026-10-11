const logger = require('@config/logger.config');
const redisClient = require('@config/redis.config');

/**
 * Tiny best-effort JSON cache for the platform console's aggregate endpoints.
 *
 * Aggregate counts are comparatively expensive and a few seconds of staleness is
 * acceptable for monitoring, so they are cached briefly. A cache miss or a Redis
 * outage must never break the request, so every operation fails soft.
 */

async function get(key) {
  try {
    if (!redisClient?.isOpen) {
      return null;
    }
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn({ error: error.message, key }, 'superadmin cache get failed');
    return null;
  }
}

async function set(key, value, ttlSeconds) {
  try {
    if (!redisClient?.isOpen) {
      return;
    }
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    logger.warn({ error: error.message, key }, 'superadmin cache set failed');
  }
}

module.exports = {
  get,
  set,
};
