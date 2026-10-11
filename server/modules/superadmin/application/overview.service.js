const repository = require('../infrastructure/platform-stats.repository');

/**
 * Platform monitoring overview.
 *
 * Reads the precomputed KPI snapshot (see `platform-stats.repository`) rather
 * than aggregating the primary data tables on the request path. `generatedAt`
 * is when the snapshot was produced; `stale` is true when no snapshot exists
 * yet (the scheduled refresh has not run).
 */

const EMPTY_OVERVIEW = {
  hotels: { total: 0, byStatus: {} },
  users: { total: 0, byStatus: {} },
  bookings: { total: 0 },
};

async function getOverview() {
  const snapshot = await repository.getOverviewSnapshot();

  if (!snapshot) {
    return { ...EMPTY_OVERVIEW, generatedAt: null, stale: true };
  }

  const { computedAt, ...data } = snapshot;
  return { ...data, generatedAt: computedAt, stale: false };
}

module.exports = {
  getOverview,
};
