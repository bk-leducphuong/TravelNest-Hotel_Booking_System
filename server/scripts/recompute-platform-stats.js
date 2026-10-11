require('../register-aliases');

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const db = require('@models/index.js');
const repository = require('@modules/superadmin/infrastructure/platform-stats.repository');

/**
 * Recompute the materialized platform KPI snapshot used by the superadmin
 * console. Normally run by the `platformStatsRefresh` BullMQ job; this script
 * is for manual/one-off runs and backfills:
 *
 *   npm run stats:recompute
 */
async function main() {
  const result = await repository.recompute();

  console.log(
    `✅ Platform stats recomputed: ${result.statusRows} status rows, ` +
      `${result.financeRows} finance rows at ${result.computedAt.toISOString()}`
  );

  return result;
}

if (require.main === module) {
  (async () => {
    try {
      await db.sequelize.authenticate();
      await main();
      await db.sequelize.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Failed to recompute platform stats:', error);
      process.exit(1);
    }
  })();
}

module.exports = { main };
