require('../register-aliases');
const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const bookingService = require('@services/booking.service');
const notificationPublisher = require('@events/notification.publisher');

const queueName = 'bookingExpiry';

async function processBookingExpiryJob(job) {
  if (job.name !== 'scan-expired-bookings') {
    throw new Error(`Unknown booking expiry job: ${job.name}`);
  }

  const limit = parseInt(process.env.BOOKING_EXPIRY_SCAN_LIMIT || '100', 10);
  const result = await bookingService.expirePendingBookings({ limit });

  await Promise.all(
    result.expiredBookings.map((booking) => notificationPublisher.publishBookingExpired(booking))
  );

  return result;
}

const bookingExpiryWorker = new Worker(queueName, processBookingExpiryJob, {
  ...config.workerOptions,
  concurrency: parseInt(process.env.BULLMQ_BOOKING_EXPIRY_CONCURRENCY || '2', 10),
});

bookingExpiryWorker.name = queueName;

bookingExpiryWorker.on('completed', (job, result) => {
  logger.info(
    {
      jobId: job.id,
      processed: result?.processed,
      released: result?.released,
    },
    `Booking expiry job completed: ${job.id}`
  );
});

bookingExpiryWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    },
    `Booking expiry job failed: ${job?.id} - ${err.message}`
  );
});

bookingExpiryWorker.on('error', (err) => {
  logger.error('Booking expiry worker error:', err);
});

module.exports = bookingExpiryWorker;
