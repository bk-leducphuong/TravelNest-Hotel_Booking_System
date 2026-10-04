const redisClient = require('@config/redis.config');

const { enrichHotelCardsByIds } = require('./hotel-cards');
const { recentlyViewedKey } = require('./recordRecentlyViewedHotel');

/**
 * Get recently viewed hotels for a user from Redis, enriched from MySQL.
 */
async function getRecentlyViewedHotels(userId, limit = 10) {
  if (!userId) return [];

  const key = recentlyViewedKey(userId);
  const safeLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));

  // node-redis v4 uses zRange with { REV: true } instead of zRevRange
  const hotelIds = await redisClient.zRange(key, 0, safeLimit - 1, { REV: true });

  return enrichHotelCardsByIds(hotelIds);
}

module.exports = { getRecentlyViewedHotels };
