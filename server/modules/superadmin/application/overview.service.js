const repository = require('../infrastructure/superadmin.repository');

/**
 * Platform monitoring overview.
 *
 * Returns high-level KPI counts across every hotel, user and booking. The
 * `generatedAt` timestamp lets the UI show freshness while aggregates are
 * eventually moved to the analytics service / a cache.
 */
async function getOverview() {
  const overview = await repository.getPlatformOverview();

  return {
    ...overview,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getOverview,
};
