const redisClient = require('@config/redis.config');
const catalog = require('@modules/catalog');
const logger = require('@config/logger.config');

function recentSearchKey(userId) {
  return `recent_searches:user:${userId}`;
}

/**
 * Trim, strip markup/control characters and cap length before persisting
 * user-supplied text (defense-in-depth; output is also escaped client-side).
 */
function sanitizeText(value, maxLength = 100) {
  if (typeof value !== 'string') return null;

  const cleaned = value
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();

  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function toIsoDay(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

/**
 * Identity of a "search" as the user perceives it: destination, dates and
 * guests. Sorting, filters and pagination are deliberately excluded so that
 * changing the sort order (or re-applying a filter) refreshes the existing
 * entry instead of stacking near-duplicates.
 */
function criteriaKey(search) {
  return JSON.stringify({
    cityId: search.cityId ?? null,
    countryId: search.countryId ?? null,
    city: search.city ? String(search.city).toLowerCase() : null,
    country: search.country ? String(search.country).toLowerCase() : null,
    latitude: search.latitude ?? null,
    longitude: search.longitude ?? null,
    radius: search.radius ?? null,
    checkIn: toIsoDay(search.checkIn),
    checkOut: toIsoDay(search.checkOut),
    adults: search.adults ?? null,
    children: search.children ?? 0,
    rooms: search.rooms ?? 1,
  });
}

function parseEntry(entry) {
  try {
    return JSON.parse(entry);
  } catch {
    return null;
  }
}

/**
 * A search whose check-in date is already behind us can no longer be replayed:
 * `GET /search/hotels` rejects a past `checkIn`. Keep it out of the list.
 */
function isStaleSearch(search, now = new Date()) {
  const checkIn = search.checkIn ? new Date(search.checkIn) : null;
  if (!checkIn || Number.isNaN(checkIn.getTime())) return false;

  return checkIn <= now;
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
    city: sanitizeText(rawParams.city),
    country: sanitizeText(rawParams.country),
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

  // Drop earlier entries for the same destination/dates/guests so the set
  // tracks distinct searches rather than every sort/filter interaction.
  const criteria = criteriaKey(payload);
  const existing = await redisClient.zRange(key, 0, -1);
  const duplicates = existing.filter((entry) => {
    const search = parseEntry(entry);
    return search ? criteriaKey(search) === criteria : false;
  });

  if (duplicates.length > 0) {
    await redisClient.zRem(key, duplicates);
  }

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

  // Read the whole set (bounded by maxItems) so stale entries can be skipped
  // without hiding valid ones behind them in the ranking.
  const raw = await redisClient.zRange(key, 0, -1, { REV: true });
  const searches = [];
  const staleMembers = [];
  const now = new Date();

  for (const entry of raw) {
    const search = parseEntry(entry);

    if (!search || isStaleSearch(search, now)) {
      staleMembers.push(entry);
      continue;
    }

    searches.push(search);
  }

  // Best-effort prune: stale entries would otherwise occupy slots in the
  // capped set and keep being filtered out on every read.
  if (staleMembers.length > 0) {
    try {
      await redisClient.zRem(key, staleMembers);
    } catch (error) {
      logger.error(error, 'Failed to prune stale recent searches:');
    }
  }

  const visible = searches.slice(0, safeLimit);
  const cityIds = [...new Set(visible.map((search) => search.cityId).filter(Boolean))];

  if (cityIds.length > 0) {
    const imagesByCityId = await catalog.getCityImagesByCityIds(cityIds);

    for (const search of visible) {
      if (!search.cityId) continue;

      const cityImages = imagesByCityId.get(search.cityId) || [];
      const primaryImage = cityImages.find((img) => img.isPrimary) || cityImages[0] || null;

      search.image = primaryImage ? { objectKey: primaryImage.objectKey } : null;
    }
  }

  return visible;
}

module.exports = { recordRecentSearch, getRecentSearches };
