const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const notificationQueue = new Queue('notification', {
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

notificationQueue.on('error', (error) => {
  logger.error('Notification queue error:', error);
});

notificationQueue.on('waiting', (job) => {
  logger.debug(`Notification job waiting: ${job.id}`);
});

/**
 * Add a notification job to the queue.
 * @param {string} type - One of: new_booking, booking_status_update, refund, payout, review
 * @param {Object} data - Payload for the notification (depends on type)
 * @param {Object} [options] - BullMQ job options (delay, priority, etc.)
 * @returns {Promise<Job>}
 */
async function addNotificationJob(type, data, options = {}) {
  return notificationQueue.add('send', { type, data }, options);
}

module.exports = notificationQueue;
module.exports.addNotificationJob = addNotificationJob;
