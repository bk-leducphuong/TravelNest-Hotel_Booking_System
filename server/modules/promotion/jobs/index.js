const queue = require('./promotionReconcile.queue');
const { createPromotionReconcileWorker } = require('./promotionReconcile.worker');

module.exports = {
  promotionReconcile: {
    queue,
    schedule: queue.schedulePromotionReconcileScanner,
    createWorker: createPromotionReconcileWorker,
  },
};
