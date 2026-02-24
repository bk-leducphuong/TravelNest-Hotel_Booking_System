require('module-alias/register');
const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const emailService = require('@services/email.service');

const queueName = 'email';

async function processEmailJob(job) {
  const { type, data } = job.data;

  logger.info(
    {
      type,
      jobId: job.id,
      to: data?.email || data?.to,
    },
    '[Worker] Processing email job'
  );

  switch (type) {
    case 'booking_confirmation':
      await emailService.sendBookingConfirmation(data);
      break;

    case 'payment_failure':
      await emailService.sendPaymentFailure(data);
      break;

    case 'refund_confirmation':
      await emailService.sendRefundConfirmation(data);
      break;

    case 'otp_verification':
      await emailService.sendOTPVerification(data);
      break;

    case 'template':
      await emailService.sendTemplateEmail(data);
      break;

    case 'custom':
      await emailService.sendCustomEmail(data);
      break;

    default:
      logger.warn('Unknown email job type', { type, jobId: job.id });
      throw new Error(`Unknown email job type: ${type}`);
  }

  return { success: true, type };
}

const emailWorker = new Worker(queueName, processEmailJob, {
  ...config.workerOptions,
  concurrency: parseInt(process.env.BULLMQ_EMAIL_CONCURRENCY || '5', 10),
});

emailWorker.name = queueName;

emailWorker.on('completed', (job) => {
  logger.info(
    {
      jobId: job.id,
      type: job.data?.type,
      duration: Date.now() - job.timestamp,
    },
    `Email job completed: ${job.id}`
  );
});

emailWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      type: job?.data?.type,
      error: err.message,
      errorCode: err.code,
      attemptsMade: job?.attemptsMade,
      to: job?.data?.data?.email || job?.data?.data?.to,
    },
    `Email job failed: ${job?.id} - ${err.message}`
  );
});

emailWorker.on('error', (err) => {
  logger.error('Email worker error:', err);
});

emailWorker.on('active', (job) => {
  logger.debug(
    { jobId: job.id, type: job.data?.type },
    `Email job started: ${job.id}`
  );
});

module.exports = emailWorker;
