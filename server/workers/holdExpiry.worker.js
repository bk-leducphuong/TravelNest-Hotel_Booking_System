require('../register-aliases');
const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const holdService = require('@services/hold.service');
const { publishHoldExpired } = require('@events/holdExpiry.publisher');

const queueName = 'holdExpiry';

async function processHoldExpiryJob(job) {
  if (job.name !== 'scan-expired-holds') {
    throw new Error(`Unknown hold expiry job: ${job.name}`);
  }

  const limit = parseInt(process.env.HOLD_EXPIRY_SCAN_LIMIT || '100', 10);
  const result = await holdService.releaseExpiredHolds({ limit });

  await Promise.all(
    result.expiredHolds.map((hold) =>
      publishHoldExpired({
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

const holdExpiryWorker = new Worker(queueName, processHoldExpiryJob, {
  ...config.workerOptions,
  concurrency: parseInt(process.env.BULLMQ_HOLD_EXPIRY_CONCURRENCY || '2', 10),
});

holdExpiryWorker.name = queueName;

holdExpiryWorker.on('completed', (job, result) => {
  logger.info(
    {
      jobId: job.id,
      processed: result?.processed,
      released: result?.released,
    },
    `Hold expiry job completed: ${job.id}`
  );
});

holdExpiryWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    },
    `Hold expiry job failed: ${job?.id} - ${err.message}`
  );
});

holdExpiryWorker.on('error', (err) => {
  logger.error('Hold expiry worker error:', err);
});

module.exports = holdExpiryWorker;
