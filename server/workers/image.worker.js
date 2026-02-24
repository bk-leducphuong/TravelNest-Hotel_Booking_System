require('module-alias/register');
const path = require('path');

const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const queueName = config.queues.imageProcessing.name;
const workerOptions = config.queues.imageProcessing.workerOptions;

const imageWorker = new Worker(queueName, path.join(__dirname, 'processors/image.processor.js'), {
  ...workerOptions,
  concurrency: workerOptions.concurrency,
});

imageWorker.on('completed', (job) => {
  logger.info(
    {
      imageId: job.data.imageId,
      duration: Date.now() - job.timestamp,
      returnValue: job.returnvalue,
    },
    `Image job completed: ${job.id}`
  );
});

imageWorker.on('failed', (job, err) => {
  logger.error(
    {
      imageId: job?.data?.imageId,
      error: err.message,
      stack: err.stack,
      attemptsMade: job?.attemptsMade,
    },
    `Image job failed: ${job?.id}`
  );
});

imageWorker.on('progress', (job, progress) => {
  logger.debug(
    {
      imageId: job.data.imageId,
      progress: `${progress}%`,
    },
    `Image job progress: ${job.id}`
  );
});

imageWorker.on('error', (err) => {
  logger.error({ error: err.message, stack: err.stack }, 'Image worker error:');
});

imageWorker.on('active', (job) => {
  logger.info(
    {
      imageId: job.data.imageId,
    },
    `Image job started: ${job.id}`
  );
});

module.exports = imageWorker;
