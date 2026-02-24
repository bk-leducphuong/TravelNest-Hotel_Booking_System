const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const imageProcessingQueue = new Queue(config.queues.imageProcessing.name, {
  connection: config.connection,
  defaultJobOptions: config.queues.imageProcessing.options,
});

imageProcessingQueue.on('error', (error) => {
  logger.error('Image processing queue error:', error);
});

imageProcessingQueue.on('waiting', (job) => {
  logger.debug(`Job waiting: ${job.id}`);
});

module.exports = imageProcessingQueue;
