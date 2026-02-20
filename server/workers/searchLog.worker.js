require('module-alias/register');
const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const searchLogClickHouseRepository = require('@repositories/clickhouse/search_log.repository');

const queueName = 'searchLog';

const processSearchLogJob = async (job) => {
  const { searchData, userId, metadata } = job.data;

  logger.info(
    {
      city: searchData.city,
      userId,
    },
    `[Worker] Processing search log`
  );

  try {
    const searchLog = await searchLogClickHouseRepository.createSearchLog({
      location: searchData.city || searchData.country,
      userId,
      checkInDate: searchData.checkIn,
      checkOutDate: searchData.checkOut,
      adults: searchData.adults,
      children: searchData.children || 0,
      rooms: searchData.rooms || 1,
    });

    logger.info(
      {
        searchLogId: searchLog.search_id,
        userId,
      },
      `Search log created in ClickHouse`
    );

    return { success: true, searchLogId: searchLog.search_id };
  } catch (error) {
    logger.error(
      {
        error: error.message,
        errorCode: error.code,
        errorType: error.type,
        stack: error.stack,
        searchData,
      },
      `Failed to save search log: ${error.message}`
    );
    throw error;
  }
};

const searchLogWorker = new Worker(queueName, processSearchLogJob, {
  ...config.workerOptions,
  concurrency: 20,
});

searchLogWorker.on('completed', (job) => {
  logger.info(
    {
      jobId: job.id,
      duration: Date.now() - job.timestamp,
    },
    `Search log job completed: ${job.id}`
  );
});

searchLogWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err.message,
      errorCode: err.code,
      errorType: err.type,
      stack: err.stack,
      attemptsMade: job?.attemptsMade,
      jobData: job?.data,
    },
    `Search log job failed: ${job?.id} - ${err.message}`
  );
});

searchLogWorker.on('error', (err) => {
  logger.error('Search log worker error:', err);
});

searchLogWorker.on('active', (job) => {
  logger.debug({ jobId: job.id }, `Search log job started: ${job.id}`);
});

module.exports = searchLogWorker;
