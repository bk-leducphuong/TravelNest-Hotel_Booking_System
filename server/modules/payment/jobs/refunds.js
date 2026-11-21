const { Queue, Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const { publish } = require('@platform/events');
const refunds = require('../infrastructure/refund.repository');
const outbox = require('../infrastructure/outbox.repository');
const { processRefundAttempt } = require('../application/admin/processRefundAttempt');

let queue;
let reconciliationQueue;

// Reuse the producer connection when scheduling recovery jobs within this process.
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

/** Recover due refunds, then deliver the events saved by payment/cancellation transactions. */
async function processRefundRecovery() {
  // The SQL obligation is the durable work item. Redis loss does not lose it.
  // The repository excludes refunds waiting for backoff, an active lease, or manual attention.
  const due = await refunds.due(50);
  // Bound provider/database load: process at most five refunds in parallel per batch.
  for (let index = 0; index < due.length; index += 5) {
    await Promise.all(
      due.slice(index, index + 5).map(async (refund) => {
        try {
          // The application service owns leasing, Stripe idempotency, retries, and reconciliation.
          await processRefundAttempt({ refundId: refund.id });
        } catch (error) {
          // One deferred refund must not prevent the remaining refunds from being attempted.
          logger.error({ refundId: refund.id, error: error.message }, 'Refund recovery deferred');
        }
      })
    );
  }
  // Events are committed with business changes and delivered separately after those commits.
  for (const event of await outbox.pending(100)) {
    if (event.event_type === 'payment.refund_succeeded') {
      const current = await refunds.findById(event.payload.refundId);
      if (current?.status !== 'succeeded') {
        // A later provider failure may supersede success. Retire the stale success event.
        await outbox.delivered(event.id);
        continue;
      }
    }
    const result = await publish(event.event_type, event.payload);
    if (
      result.local?.some((item) => item === null) ||
      result.responses?.some((item) => item.error || item.result === null)
    ) {
      // Leave the event pending so a later run can retry delivery.
      throw new Error(`Refund outbox delivery failed: ${event.id}`);
    }
    // A crash before this acknowledgement can cause redelivery; consumers must be idempotent.
    await outbox.delivered(event.id);
  }
  return { scanned: due.length };
}

// Log both worker-level errors and failed job executions.
function attachLogging(worker) {
  worker.on('error', (error) => logger.error({ error: error.message }, 'Refund worker error'));
  worker.on('failed', (job, error) =>
    logger.error({ jobId: job?.id, error: error.message }, 'Refund job failed')
  );
  return worker;
}
function createWorker() {
  // Each worker runs one recovery job at a time; that job still processes batches in parallel.
  return attachLogging(
    new Worker('refundRecovery', processRefundRecovery, { ...config.workerOptions, concurrency: 1 })
  );
}
function createReconciliationWorker() {
  // The provider-to-ledger sweep checks existing refunds, including completed/attention records.
  // It repairs local state from Stripe and never creates a new provider refund.
  return attachLogging(
    new Worker(
      'refundReconciliation',
      () => require('../application/reconcileRefunds').reconcileRefunds(),
      { ...config.workerOptions, concurrency: 1 }
    )
  );
}
function getReconciliationQueue() {
  if (!reconciliationQueue) {
    reconciliationQueue = new Queue('refundReconciliation', {
      connection: config.connection,
      defaultJobOptions: config.defaultJobOptions,
    });
    reconciliationQueue.on('error', (error) =>
      logger.error({ error: error.message }, 'Refund reconciliation queue error')
    );
  }

  return reconciliationQueue;
}

// Register recurring triggers. Per-refund retry times remain persisted in MySQL.
async function schedule() {
  // Daily sweep catches provider/local drift even if webhook delivery was missed.
  await getReconciliationQueue().add(
    'reconcile-refunds',
    {},
    { jobId: 'refund-reconciliation', repeat: { every: 86400000 } }
  );
  // Poll every 15 seconds for due work; this is not a fixed retry delay for each refund.
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
  getReconciliationQueue,
  processRefundRecovery,
};
