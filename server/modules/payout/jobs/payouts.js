const { Queue, Worker } = require('bullmq');

const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const payoutService = require('../application/payout.service');
const payoutRepository = require('../infrastructure/payout.repository');
const settings = require('../application/payout-settings');
const { generateEligiblePayouts } = require('../application/admin/generateEligiblePayouts');
const { processPayout } = require('../application/admin/processPayout');

const QUEUES = {
  GENERATION: 'payoutGeneration',
  PROCESSING: 'payoutProcessing',
  RECOVERY: 'payoutRecovery',
};

const queues = {};

function getQueue(name) {
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection: config.connection,
      defaultJobOptions: config.defaultJobOptions,
    });
    queues[name].on('error', (error) =>
      logger.error({ queue: name, error: error.message }, 'Payout queue error')
    );
  }
  return queues[name];
}

function attachLogging(worker, label) {
  worker.on('error', (error) =>
    logger.error({ worker: label, error: error.message }, 'Payout worker error')
  );
  worker.on('failed', (job, error) =>
    logger.error({ worker: label, jobId: job?.id, error: error.message }, 'Payout job failed')
  );
  return worker;
}

async function enqueuePayout(payoutId) {
  if (!payoutId) return null;
  return await getQueue(QUEUES.PROCESSING).add(
    'process-payout',
    { payoutId },
    { jobId: `payout-${payoutId}` }
  );
}

/**
 * Never let a retry re-run a payout whose outcome is already decided: the
 * recovery queue owns unknown outcomes, and terminal/pending-mismatch states
 * are simply skipped.
 */
const NON_RETRYABLE_PAYOUT_CODES = new Set([
  'PAYOUT_NOT_FOUND',
  'PAYOUT_NOT_PROCESSABLE',
  'PAYOUT_ALREADY_CLAIMED',
  'PAYOUT_ACCOUNT_NOT_READY',
  'PAYOUT_BALANCE_RESERVED',
  'PAYOUT_FAILED',
  'PAYOUT_OUTCOME_UNKNOWN',
  'PAYOUT_SETTLEMENT_FAILED',
  'STRIPE_NOT_CONFIGURED',
]);

async function processPayoutGeneration(job = {}) {
  if (!settings.isAutoGenerateEnabled()) {
    // A repeatable job can outlive the flag (Redis retains it). Treat the
    // environment flag as the source of truth.
    return { skipped: true, reason: 'auto_generate_disabled' };
  }

  const data = job.data || {};
  const result = await generateEligiblePayouts({
    cutoffDate: data.cutoffDate ? new Date(data.cutoffDate) : undefined,
    hotelId: data.hotelId,
    actorUserId: null,
  });

  let enqueued = 0;
  if (settings.isAutoProcessEnabled()) {
    const pending = await payoutRepository.findPendingPayouts(settings.getRecoveryBatchSize());
    const ids = new Set([
      ...result.payouts.map((payout) => payout.id),
      ...pending.map((payout) => payout.id),
    ]);
    for (const payoutId of ids) {
      await enqueuePayout(payoutId);
      enqueued += 1;
    }
  }

  logger.info(
    { scanned: result.scanned, created: result.created, enqueued },
    'Payout generation cycle finished'
  );

  return { ...result, enqueued };
}

async function processQueuedPayout(job = {}) {
  const payoutId = job.data?.payoutId;
  if (!payoutId) return null;

  if (!settings.isAutoProcessEnabled()) {
    logger.info({ payoutId }, 'Payout processing skipped: auto-process disabled');
    return null;
  }

  try {
    return await processPayout(payoutId, { actorUserId: null });
  } catch (error) {
    if (NON_RETRYABLE_PAYOUT_CODES.has(error.code)) {
      logger.warn({ payoutId, code: error.code, error: error.message }, 'Payout job not retried');
      return null;
    }
    throw error;
  }
}

/**
 * Re-drive lost transfer responses and (when enabled) pick up any pending
 * payouts that generation could not enqueue (e.g. Redis was down).
 */
async function processPayoutRecovery() {
  const stale = await payoutRepository.findStaleProcessingPayouts(
    settings.getStaleThresholdDate(),
    settings.getRecoveryBatchSize()
  );

  let recovered = 0;
  for (const payout of stale) {
    try {
      await payoutService.resumeStripeTransfer(payout.id);
      recovered += 1;
    } catch (error) {
      logger.error(
        { payoutId: payout.id, code: error.code, error: error.message },
        'Payout recovery failed'
      );
    }
  }

  let enqueued = 0;
  if (settings.isAutoProcessEnabled()) {
    const pending = await payoutRepository.findPendingPayouts(settings.getRecoveryBatchSize());
    for (const payout of pending) {
      await enqueuePayout(payout.id);
      enqueued += 1;
    }
  }

  if (stale.length || enqueued) {
    logger.info({ stale: stale.length, recovered, enqueued }, 'Payout recovery cycle finished');
  }

  return { stale: stale.length, recovered, enqueued };
}

function createGenerationWorker() {
  return attachLogging(
    new Worker(QUEUES.GENERATION, processPayoutGeneration, {
      ...config.workerOptions,
      concurrency: 1,
    }),
    'generation'
  );
}

function createProcessingWorker() {
  return attachLogging(
    new Worker(QUEUES.PROCESSING, processQueuedPayout, {
      ...config.workerOptions,
      concurrency: 1,
    }),
    'processing'
  );
}

function createRecoveryWorker() {
  return attachLogging(
    new Worker(QUEUES.RECOVERY, processPayoutRecovery, {
      ...config.workerOptions,
      concurrency: 1,
    }),
    'recovery'
  );
}

async function schedule() {
  if (settings.isAutoGenerateEnabled()) {
    await getQueue(QUEUES.GENERATION).add(
      'generate-payouts',
      {},
      {
        jobId: 'payout-generation',
        repeat: { every: settings.getGenerationIntervalMs() },
      }
    );
    logger.info({ everyMs: settings.getGenerationIntervalMs() }, 'Payout generation scheduled');
  } else {
    logger.info('Payout auto-generation disabled (PAYOUT_AUTO_GENERATE)');
  }

  // Recovery always runs: it closes stale transfers and, when auto-processing
  // is enabled, drains pending payouts.
  await getQueue(QUEUES.RECOVERY).add(
    'recover-payouts',
    {},
    {
      jobId: 'payout-recovery',
      repeat: { every: settings.getProcessingIntervalMs() },
    }
  );
}

module.exports = {
  QUEUES,
  getQueue,
  enqueuePayout,
  processPayoutGeneration,
  processQueuedPayout,
  processPayoutRecovery,
  createGenerationWorker,
  createProcessingWorker,
  createRecoveryWorker,
  schedule,
};
