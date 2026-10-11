const repository = require('../infrastructure/superadmin.repository');
const cache = require('../infrastructure/cache');

/**
 * Platform monitoring overview.
 *
 * Returns high-level KPI counts across every hotel, user and booking. The result
 * is cached briefly in Redis (the counts are expensive and a little staleness is
 * fine for monitoring). Eventually the aggregates should come from the analytics
 * service rather than the primary database — see SUPERADMIN_PLAN.md D4.
 */

const CACHE_KEY = 'superadmin:overview';
const CACHE_TTL_SECONDS = 60;

async function getOverview() {
  const cached = await cache.get(CACHE_KEY);
  if (cached) {
    return cached;
  }

  const overview = await repository.getPlatformOverview();
  const result = {
    ...overview,
    generatedAt: new Date().toISOString(),
  };

  await cache.set(CACHE_KEY, result, CACHE_TTL_SECONDS);

  return result;
}

module.exports = {
  getOverview,
};
