const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const { publish, HOLD_EVENTS } = require('@platform/events');
const holdService = require('../application/hold.service');

const queueName = 'holdExpiry';

async function processHoldExpiryJob(job) {
  if (job.name !== 'scan-expired-holds') {
    throw new Error(`Unknown hold expiry job: ${job.name}`);
  }

  const limit = parseInt(process.env.HOLD_EXPIRY_SCAN_LIMIT || '100', 10);
  const result = await holdService.releaseExpiredHolds({ limit });

  await Promise.all(
    result.expiredHolds.map((hold) =>
      publish(HOLD_EVENTS.HOLD_EXPIRED, {
        holdId: hold.holdId,
        userId: hold.userId,
        hotelId: hold.hotelId,
        checkInDate: hold.checkInDate,
        checkOutDate: hold.checkOutDate,
        expiredAt: hold.expiredAt,
      })
    )
  );

  return result;
}

/**
 * Build the hold-expiry BullMQ worker.
 *
 * A Worker opens a Redis connection on construction, so this is a factory
 * rather than a module-level singleton: only the worker process (workers/index.js)
 * should build it. Importing the booking module must not start consuming jobs.
 */
function createHoldExpiryWorker() {
  const worker = new Worker(queueName, processHoldExpiryJob, {
    ...config.workerOptions,
    concurrency: parseInt(process.env.BULLMQ_HOLD_EXPIRY_CONCURRENCY || '2', 10),
  });

  worker.name = queueName;

  worker.on('completed', (job, result) => {
    logger.info(
      {
        jobId: job.id,
        processed: result?.processed,
        released: result?.released,
      },
      `Hold expiry job completed: ${job.id}`
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        error: err.message,
        attemptsMade: job?.attemptsMade,
      },
      `Hold expiry job failed: ${job?.id} - ${err.message}`
    );
  });

  worker.on('error', (err) => {
    logger.error('Hold expiry worker error:', err);
  });

  return worker;
}

module.exports = { createHoldExpiryWorker, processHoldExpiryJob };
