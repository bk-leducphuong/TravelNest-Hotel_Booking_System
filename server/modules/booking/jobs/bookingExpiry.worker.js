const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const notificationPublisher = require('@platform/events/producers/notification');
const { expirePendingBookings } = require('../application/expiry/expirePendingBookings');

const queueName = 'bookingExpiry';

async function processBookingExpiryJob(job) {
  if (job.name !== 'scan-expired-bookings') {
    throw new Error(`Unknown booking expiry job: ${job.name}`);
  }

  const limit = parseInt(process.env.BOOKING_EXPIRY_SCAN_LIMIT || '100', 10);
  const result = await expirePendingBookings({ limit });

  await Promise.all(
    result.expiredBookings.map((booking) => notificationPublisher.publishBookingExpired(booking))
  );

  return result;
}

/**
 * Build the booking-expiry BullMQ worker.
 *
 * A Worker opens a Redis connection on construction, so this is a factory
 * rather than a module-level singleton: only the worker process (workers/index.js)
 * should build it. Importing the booking module must not start consuming jobs.
 */
function createBookingExpiryWorker() {
  const worker = new Worker(queueName, processBookingExpiryJob, {
    ...config.workerOptions,
    concurrency: parseInt(process.env.BULLMQ_BOOKING_EXPIRY_CONCURRENCY || '2', 10),
  });

  worker.name = queueName;

  worker.on('completed', (job, result) => {
    logger.info(
      {
        jobId: job.id,
        processed: result?.processed,
        released: result?.released,
      },
      `Booking expiry job completed: ${job.id}`
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        error: err.message,
        attemptsMade: job?.attemptsMade,
      },
      `Booking expiry job failed: ${job?.id} - ${err.message}`
    );
  });

  worker.on('error', (err) => {
    logger.error('Booking expiry worker error:', err);
  });

  return worker;
}

module.exports = { createBookingExpiryWorker, processBookingExpiryJob };
