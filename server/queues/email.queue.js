const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const emailQueue = new Queue('email', {
  connection: config.connection,
  defaultJobOptions: {
    ...config.defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
  },
});

emailQueue.on('error', (error) => {
  logger.error('Email queue error:', error);
});

emailQueue.on('waiting', (job) => {
  logger.debug(`Email job waiting: ${job.id}`);
});

/**
 * Add an email job to the queue.
 * @param {string} type - One of: booking_confirmation, payment_failure, refund_confirmation, otp_verification, template, custom
 * @param {Object} data - Payload for the email (depends on type)
 * @param {Object} [options] - BullMQ job options (delay, priority, etc.)
 * @returns {Promise<Job>}
 */
async function addEmailJob(type, data, options = {}) {
  return emailQueue.add('send', { type, data }, options);
}

module.exports = emailQueue;
module.exports.addEmailJob = addEmailJob;
