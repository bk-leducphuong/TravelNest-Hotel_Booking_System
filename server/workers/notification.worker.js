require('module-alias/register');
const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const notificationService = require('@services/notification.service');

const queueName = 'notification';

async function processNotificationJob(job) {
  const { type, data } = job.data;

  logger.info(
    {
      type,
      jobId: job.id,
      ...(data?.buyerId && { buyerId: data.buyerId }),
      ...(data?.hotelId && { hotelId: data.hotelId }),
      ...(data?.bookingCode && { bookingCode: data.bookingCode }),
    },
    '[Worker] Processing notification job'
  );

  switch (type) {
    case 'new_booking':
      await notificationService.sendNewBookingNotification(data);
      break;

    case 'booking_status_update':
      await notificationService.sendBookingStatusUpdate(
        data.bookingId,
        data.oldStatus,
        data.newStatus,
        data.updatedBy ?? 'admin'
      );
      break;

    case 'refund':
      await notificationService.sendRefundNotification(data);
      break;

    case 'payout':
      await notificationService.sendPayoutNotification(data);
      break;

    case 'review':
      await notificationService.sendReviewNotification(data);
      break;

    default:
      logger.warn('Unknown notification job type', { type, jobId: job.id });
      throw new Error(`Unknown notification job type: ${type}`);
  }

  return { success: true, type };
}

const notificationWorker = new Worker(queueName, processNotificationJob, {
  ...config.workerOptions,
  concurrency: parseInt(
    process.env.BULLMQ_NOTIFICATION_CONCURRENCY || '10',
    10
  ),
});

notificationWorker.name = queueName;

notificationWorker.on('completed', (job) => {
  logger.info(
    {
      jobId: job.id,
      type: job.data?.type,
      duration: Date.now() - job.timestamp,
    },
    `Notification job completed: ${job.id}`
  );
});

notificationWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      type: job?.data?.type,
      error: err.message,
      errorCode: err.code,
      attemptsMade: job?.attemptsMade,
      jobData: job?.data,
    },
    `Notification job failed: ${job?.id} - ${err.message}`
  );
});

notificationWorker.on('error', (err) => {
  logger.error('Notification worker error:', err);
});

notificationWorker.on('active', (job) => {
  logger.debug(
    { jobId: job.id, type: job.data?.type },
    `Notification job started: ${job.id}`
  );
});

module.exports = notificationWorker;
