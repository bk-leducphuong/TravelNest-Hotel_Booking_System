const logger = require('@config/logger.config');
const redisClient = require('@config/redis.config');

function recentlyViewedKey(userId) {
  return `recently_viewed_hotels:user:${userId}`;
}

/**
 * Record a hotel as recently viewed for a user (Redis sorted set).
 * Stores hotelId as member with score=timestamp; keeps only the latest N.
 */
async function recordRecentlyViewedHotel(
  userId,
  hotelId,
  { maxItems = 50, ttlSeconds = 60 * 60 * 24 * 30 } = {}
) {
  logger.debug({ userId, hotelId }, 'Recording recently viewed hotel');
  if (!userId || !hotelId) return;

  const key = recentlyViewedKey(userId);
  const score = Date.now();

  // Update recency
  await redisClient.zAdd(key, [{ score, value: String(hotelId) }]);

  // Trim to latest maxItems (rank 0 is smallest score)
  const safeMax = Math.max(1, parseInt(maxItems, 10) || 50);
  const total = await redisClient.zCard(key);
  if (total > safeMax) {
    await redisClient.zRemRangeByRank(key, 0, total - safeMax - 1);
  }

  // Best-effort TTL
  await redisClient.expire(key, Math.max(60, ttlSeconds));
}

module.exports = { recordRecentlyViewedHotel, recentlyViewedKey };
