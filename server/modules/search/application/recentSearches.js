const redisClient = require('@config/redis.config');
const catalog = require('@modules/catalog');

function recentSearchKey(userId) {
  return `recent_searches:user:${userId}`;
}

/**
 * Store a compact representation of the user's recent search in Redis.
 */
async function recordRecentSearch(
  userId,
  rawParams,
  { maxItems = 20, ttlSeconds = 60 * 60 * 24 * 30 } = {}
) {
  if (!userId) return;

  const key = recentSearchKey(userId);

  const payload = {
    cityId: rawParams.cityId ?? null,
    countryId: rawParams.countryId ?? null,
    city: rawParams.city || null,
    country: rawParams.country || null,
    latitude: rawParams.latitude ?? null,
    longitude: rawParams.longitude ?? null,
    radius: rawParams.radius ?? null,
    checkIn: rawParams.checkIn,
    checkOut: rawParams.checkOut,
    adults: rawParams.adults,
    children: rawParams.children ?? 0,
    rooms: rawParams.rooms ?? 1,
    sortBy: rawParams.sortBy || 'relevance',
    minPrice: rawParams.minPrice ?? null,
    maxPrice: rawParams.maxPrice ?? null,
    minRating: rawParams.minRating ?? null,
    hotelClass: rawParams.hotelClass ?? null,
    amenities: rawParams.amenities ?? null,
    createdAt: new Date().toISOString(),
  };

  const value = JSON.stringify(payload);
  const score = Date.now();

  await redisClient.zAdd(key, [{ score, value }]);

  const safeMax = Math.max(1, parseInt(maxItems, 10) || 20);
  const total = await redisClient.zCard(key);
  if (total > safeMax) {
    await redisClient.zRemRangeByRank(key, 0, total - safeMax - 1);
  }

  await redisClient.expire(key, Math.max(60, ttlSeconds));
}

/**
 * Get the user's recent searches from Redis (most recent first), enriched with
 * the primary city image.
 */
async function getRecentSearches(userId, limit = 10) {
  if (!userId) return [];

  const key = recentSearchKey(userId);
  const safeLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));

  const raw = await redisClient.zRange(key, 0, safeLimit - 1, { REV: true });
  const searches = raw
    .map((entry) => {
      try {
        return JSON.parse(entry);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const cityIds = [...new Set(searches.map((search) => search.cityId).filter(Boolean))];

  if (cityIds.length > 0) {
    const imagesByCityId = await catalog.getCityImagesByCityIds(cityIds);

    for (const search of searches) {
      if (!search.cityId) continue;

      const cityImages = imagesByCityId.get(search.cityId) || [];
      const primaryImage = cityImages.find((img) => img.isPrimary) || cityImages[0] || null;

      search.image = primaryImage ? { objectKey: primaryImage.objectKey } : null;
    }
  }

  return searches;
}

module.exports = { recordRecentSearch, getRecentSearches };
