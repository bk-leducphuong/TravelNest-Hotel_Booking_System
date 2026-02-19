require('module-alias/register');
const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const searchRepository = require('@repositories/search.repository');

const queueName = 'searchLog';

const processSearchLogJob = async (job) => {
  const { searchData, userId, metadata } = job.data;

  logger.info(`[Worker] Processing search log`, {
    city: searchData.city,
    userId,
  });

  try {
    const searchLog = await searchRepository.createSearchLog({
      location: searchData.city || searchData.country,
      userId,
      checkInDate: searchData.checkIn,
      checkOutDate: searchData.checkOut,
      adults: searchData.adults,
      children: searchData.children || 0,
      rooms: searchData.rooms || 1,
    });

    logger.info(`Search log created`, {
      searchLogId: searchLog.id,
      userId,
    });

    return { success: true, searchLogId: searchLog.id };
  } catch (error) {
    logger.error(`Failed to save search log:`, error);
    throw error;
  }
};

const searchLogWorker = new Worker(queueName, processSearchLogJob, {
  ...config.workerOptions,
  concurrency: 20,
});

searchLogWorker.on('completed', (job) => {
  logger.info(`Search log job completed: ${job.id}`, {
    duration: Date.now() - job.timestamp,
  });
});

searchLogWorker.on('failed', (job, err) => {
  logger.error(`Search log job failed: ${job?.id}`, {
    error: err.message,
    attemptsMade: job?.attemptsMade,
  });
});

searchLogWorker.on('error', (err) => {
  logger.error('Search log worker error:', err);
});

searchLogWorker.on('active', (job) => {
  logger.debug(`Search log job started: ${job.id}`);
});

module.exports = searchLogWorker;
