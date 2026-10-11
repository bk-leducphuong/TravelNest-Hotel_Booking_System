const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

/**
 * Queue that refreshes the materialized platform KPI snapshot consumed by the
 * superadmin console. A single repeatable job keeps the snapshot fresh.
 */
const platformStatsRefreshQueue = new Queue('platformStatsRefresh', {
  connection: config.connection,
  defaultJobOptions: {
    ...config.defaultJobOptions,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

platformStatsRefreshQueue.on('error', (error) => {
  logger.error('Platform stats refresh queue error:', error);
});

async function schedulePlatformStatsRefresh() {
  const every = parseInt(process.env.PLATFORM_STATS_REFRESH_INTERVAL_MS || '60000', 10);

  return platformStatsRefreshQueue.add(
    'refresh-platform-stats',
    {},
    {
      jobId: 'platform-stats-refresh',
      repeat: { every },
      removeOnComplete: true,
      removeOnFail: {
        age: 86400,
      },
    }
  );
}

module.exports = platformStatsRefreshQueue;
module.exports.schedulePlatformStatsRefresh = schedulePlatformStatsRefresh;
