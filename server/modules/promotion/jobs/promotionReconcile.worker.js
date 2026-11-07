const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const { reconcilePromotionReservations } = require('../application/reconcilePromotionReservations');

const queueName = 'promotionReconcile';

async function processPromotionReconcileJob(job) {
  if (job.name !== 'reconcile-promotion-reservations') {
    throw new Error(`Unknown promotion reconciliation job: ${job.name}`);
  }
  const limit = parseInt(process.env.PROMOTION_RECONCILE_LIMIT || '100', 10);
  return await reconcilePromotionReservations({ limit });
}

function createPromotionReconcileWorker() {
  const worker = new Worker(queueName, processPromotionReconcileJob, {
    ...config.workerOptions,
    concurrency: parseInt(process.env.BULLMQ_PROMOTION_RECONCILE_CONCURRENCY || '1', 10),
  });

  worker.name = queueName;
  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, ...result }, `Promotion reconciliation completed: ${job.id}`);
  });
  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message, attemptsMade: job?.attemptsMade },
      `Promotion reconciliation failed: ${job?.id}`
    );
  });
  worker.on('error', (err) => logger.error('Promotion reconciliation worker error:', err));

  return worker;
}

module.exports = { createPromotionReconcileWorker, processPromotionReconcileJob };
