const platformStatsRefreshQueue = require('./statsRefresh.queue');
const { createPlatformStatsRefreshWorker } = require('./statsRefresh.worker');

/**
 * Superadmin module background jobs.
 *
 * Queues are safe to build at import time; workers are exposed as factories so
 * they are only constructed by the worker process (workers/index.js).
 */
module.exports = {
  platformStatsRefresh: {
    queue: platformStatsRefreshQueue,
    schedule: platformStatsRefreshQueue.schedulePlatformStatsRefresh,
    createWorker: createPlatformStatsRefreshWorker,
  },
};
