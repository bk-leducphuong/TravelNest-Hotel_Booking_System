const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const repository = require('../infrastructure/platform-stats.repository');

const queueName = 'platformStatsRefresh';

async function processPlatformStatsRefreshJob(job) {
  if (job.name !== 'refresh-platform-stats') {
    throw new Error(`Unknown platform stats refresh job: ${job.name}`);
  }

  return await repository.recompute();
}

/**
 * Build the platform-stats refresh worker.
 *
 * A Worker opens a Redis connection on construction, so this is a factory
 * rather than a module-level singleton: only the worker process
 * (workers/index.js) should build it.
 */
function createPlatformStatsRefreshWorker() {
  const worker = new Worker(queueName, processPlatformStatsRefreshJob, {
    ...config.workerOptions,
    concurrency: 1,
  });

  worker.name = queueName;

  worker.on('completed', (job, result) => {
    logger.info(
      {
        jobId: job.id,
        statusRows: result?.statusRows,
        financeRows: result?.financeRows,
      },
      `Platform stats refresh completed: ${job.id}`
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        error: err.message,
        attemptsMade: job?.attemptsMade,
      },
      `Platform stats refresh failed: ${job?.id} - ${err.message}`
    );
  });

  worker.on('error', (err) => {
    logger.error('Platform stats refresh worker error:', err);
  });

  return worker;
}

module.exports = { createPlatformStatsRefreshWorker, processPlatformStatsRefreshJob };
