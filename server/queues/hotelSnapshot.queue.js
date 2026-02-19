const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const hotelSnapshotQueue = new Queue(
  config.queues.hotelSnapshot.name,
  {
    connection: config.connection,
    defaultJobOptions: config.queues.hotelSnapshot.options,
  }
);

hotelSnapshotQueue.on('error', (error) => {
  logger.error('Hotel snapshot queue error:', error);
});

hotelSnapshotQueue.on('waiting', (job) => {
  logger.debug(`Job waiting: ${job.id}`);
});

module.exports = hotelSnapshotQueue;
