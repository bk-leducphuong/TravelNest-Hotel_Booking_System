const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const paymentNotificationQueue = new Queue('paymentNotification', {
  connection: config.connection,
  defaultJobOptions: {
    ...config.defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60000,
    },
  },
});

paymentNotificationQueue.on('error', (error) => {
  logger.error('Payment notification queue error:', error);
});

paymentNotificationQueue.on('waiting', (job) => {
  logger.debug(`Payment notification job waiting: ${job.id}`);
});

module.exports = paymentNotificationQueue;
