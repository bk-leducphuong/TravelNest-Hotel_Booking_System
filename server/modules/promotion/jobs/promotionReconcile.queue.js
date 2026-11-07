const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const promotionReconcileQueue = new Queue('promotionReconcile', {
  connection: config.connection,
  defaultJobOptions: {
    ...config.defaultJobOptions,
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  },
});

promotionReconcileQueue.on('error', (error) => {
  logger.error('Promotion reconciliation queue error:', error);
});

async function schedulePromotionReconcileScanner() {
  const every = parseInt(process.env.PROMOTION_RECONCILE_INTERVAL_MS || '300000', 10);
  return promotionReconcileQueue.add(
    'reconcile-promotion-reservations',
    {},
    {
      jobId: 'promotion-reconcile-scanner',
      repeat: { every },
      removeOnComplete: true,
      removeOnFail: { age: 86400 },
    }
  );
}

module.exports = promotionReconcileQueue;
module.exports.schedulePromotionReconcileScanner = schedulePromotionReconcileScanner;
