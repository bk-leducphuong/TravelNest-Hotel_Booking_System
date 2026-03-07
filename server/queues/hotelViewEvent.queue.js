const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const hotelViewEventQueue = new Queue(config.queues.hotelViewEvent.name, {
  connection: config.connection,
  defaultJobOptions: {
    ...config.queues.hotelViewEvent.options,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
  },
});

hotelViewEventQueue.on('error', (error) => {
  logger.error('Hotel view event queue error:', error);
});

hotelViewEventQueue.on('waiting', (job) => {
  logger.debug(`Hotel view event job waiting: ${job.id}`);
});

module.exports = hotelViewEventQueue;
