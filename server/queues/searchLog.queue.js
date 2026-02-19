const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const searchLogQueue = new Queue(
  'searchLog',
  {
    connection: config.connection,
    defaultJobOptions: {
      ...config.defaultJobOptions,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30000,
      },
    },
  }
);

searchLogQueue.on('error', (error) => {
  logger.error('Search log queue error:', error);
});

searchLogQueue.on('waiting', (job) => {
  logger.debug(`Search log job waiting: ${job.id}`);
});

module.exports = searchLogQueue;
