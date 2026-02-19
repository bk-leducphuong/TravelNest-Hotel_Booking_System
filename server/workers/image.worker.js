require('module-alias/register');
const { Worker } = require('bullmq');
const path = require('path');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const queueName = config.queues.imageProcessing.name;
const workerOptions = config.queues.imageProcessing.workerOptions;

const imageWorker = new Worker(
  queueName,
  path.join(__dirname, 'processors/image.processor.js'),
  {
    ...workerOptions,
    concurrency: workerOptions.concurrency,
  }
);

imageWorker.on('completed', (job) => {
  logger.info(`Image job completed: ${job.id}`, {
    imageId: job.data.imageId,
    duration: Date.now() - job.timestamp,
    returnValue: job.returnvalue,
  });
});

imageWorker.on('failed', (job, err) => {
  logger.error(`Image job failed: ${job?.id}`, {
    imageId: job?.data?.imageId,
    error: err.message,
    stack: err.stack,
    attemptsMade: job?.attemptsMade,
  });
});

imageWorker.on('progress', (job, progress) => {
  logger.debug(`Image job progress: ${job.id}`, {
    imageId: job.data.imageId,
    progress: `${progress}%`,
  });
});

imageWorker.on('error', (err) => {
  logger.error('Image worker error:', err);
});

imageWorker.on('active', (job) => {
  logger.info(`Image job started: ${job.id}`, {
    imageId: job.data.imageId,
  });
});

module.exports = imageWorker;
