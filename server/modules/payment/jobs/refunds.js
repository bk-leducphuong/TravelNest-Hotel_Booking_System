const { Queue, Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const { publish } = require('@platform/events');
const refunds = require('../infrastructure/refund.repository');
const outbox = require('../infrastructure/outbox.repository');
const { processRefundAttempt } = require('../application/admin/processRefundAttempt');

let queue;
let reconciliationQueue;
function getQueue() {
  if (!queue) {
    queue = new Queue('refundRecovery', {
      connection: config.connection,
      defaultJobOptions: config.defaultJobOptions,
    });
    queue.on('error', (error) => logger.error({ error: error.message }, 'Refund queue error'));
  }
  return queue;
}
async function processRefundRecovery() {
  // The SQL obligation is the durable work item. Redis loss does not lose it.
  const due = await refunds.due(50);
  for (let index = 0; index < due.length; index += 5) {
    await Promise.all(
      due.slice(index, index + 5).map(async (refund) => {
        try {
          await processRefundAttempt({ refundId: refund.id });
        } catch (error) {
          logger.error({ refundId: refund.id, error: error.message }, 'Refund recovery deferred');
        }
      })
    );
  }
  for (const event of await outbox.pending(100)) {
    if (event.event_type === 'payment.refund_succeeded') {
      const current = await refunds.findById(event.payload.refundId);
      if (current?.status !== 'succeeded') {
        await outbox.delivered(event.id);
        continue;
      }
    }
    const result = await publish(event.event_type, event.payload);
    if (
      result.local?.some((item) => item === null) ||
      result.responses?.some((item) => item.error || item.result === null)
    ) {
      throw new Error(`Refund outbox delivery failed: ${event.id}`);
    }
    await outbox.delivered(event.id);
  }
  return { scanned: due.length };
}
function attachLogging(worker) {
  worker.on('error', (error) => logger.error({ error: error.message }, 'Refund worker error'));
  worker.on('failed', (job, error) =>
    logger.error({ jobId: job?.id, error: error.message }, 'Refund job failed')
  );
  return worker;
}
function createWorker() {
  return attachLogging(
    new Worker('refundRecovery', processRefundRecovery, { ...config.workerOptions, concurrency: 1 })
  );
}
function createReconciliationWorker() {
  return attachLogging(
    new Worker(
      'refundReconciliation',
      () => require('../application/reconcileRefunds').reconcileRefunds(),
      { ...config.workerOptions, concurrency: 1 }
    )
  );
}
async function schedule() {
  if (!reconciliationQueue) {
    reconciliationQueue = new Queue('refundReconciliation', {
      connection: config.connection,
      defaultJobOptions: config.defaultJobOptions,
    });
    reconciliationQueue.on('error', (error) =>
      logger.error({ error: error.message }, 'Refund reconciliation queue error')
    );
  }
  await reconciliationQueue.add(
    'reconcile-refunds',
    {},
    { jobId: 'refund-reconciliation', repeat: { every: 86400000 } }
  );
  return getQueue().add(
    'recover-refunds',
    {},
    { jobId: 'refund-recovery', repeat: { every: 15000 } }
  );
}

module.exports = {
  createWorker,
  createReconciliationWorker,
  schedule,
  getQueue,
  processRefundRecovery,
};
