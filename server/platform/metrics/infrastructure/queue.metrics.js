const { getMetrics } = require('./registry');

/**
 * Record job duration from BullMQ's own timestamps.
 *
 * `processedOn` and `finishedOn` are set for each attempt, so this measures the
 * handler itself and excludes time spent waiting in the queue. Failed
 * attempts are recorded with `status="failed"`.
 */
function observeJob(worker, job, status) {
  if (!job || typeof job.processedOn !== 'number' || typeof job.finishedOn !== 'number') {
    return;
  }

  const seconds = (job.finishedOn - job.processedOn) / 1000;
  if (!Number.isFinite(seconds) || seconds < 0) {
    return;
  }

  getMetrics().jobDuration.observe(
    {
      queue: worker.name || 'unknown',
      job_name: job.name || 'unknown',
      status,
    },
    seconds
  );
}

/**
 * Attach duration metrics to a BullMQ worker.
 *
 * Listeners are additive: the worker's own logging handlers keep working.
 *
 * @param {object} worker BullMQ Worker
 * @param {string} [queueName] override when `worker.name` was not set
 * @returns {object} the same worker
 */
function instrumentWorker(worker, queueName) {
  if (!worker || typeof worker.on !== 'function' || worker.__travelnestMetricsInstrumented) {
    return worker;
  }

  if (queueName && !worker.name) {
    worker.name = queueName;
  }

  worker.on('completed', (job) => observeJob(worker, job, 'completed'));
  worker.on('failed', (job) => observeJob(worker, job, 'failed'));

  worker.__travelnestMetricsInstrumented = true;

  return worker;
}

module.exports = {
  instrumentWorker,
  observeJob,
};
