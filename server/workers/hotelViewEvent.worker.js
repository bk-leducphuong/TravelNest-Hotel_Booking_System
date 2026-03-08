require('module-alias/register');
const { Worker } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');
const hotelViewEventClickHouseRepository = require('@repositories/clickhouse/hotel_view_event.repository');

const queueName = config.queues.hotelViewEvent.name;

const processHotelViewEventJob = async (job) => {
  const { events } = job.data || {};

  if (!Array.isArray(events) || events.length === 0) {
    return { success: true, inserted: 0 };
  }

  const { inserted, eventIds } =
    await hotelViewEventClickHouseRepository.insertHotelViewEvents(events);

  logger.info(
    { inserted, jobId: job.id, queue: queueName },
    `[Worker] Inserted hotel view events into ClickHouse`
  );

  return { success: true, inserted, eventIds };
};

const hotelViewEventWorker = new Worker(queueName, processHotelViewEventJob, {
  ...config.queues.hotelViewEvent.workerOptions,
});

hotelViewEventWorker.on('completed', (job) => {
  logger.debug(
    {
      jobId: job.id,
      duration: Date.now() - job.timestamp,
    },
    `Hotel view event job completed: ${job.id}`
  );
});

hotelViewEventWorker.on('failed', (job, err) => {
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
    `Hotel view event job failed: ${job?.id} - ${err.message}`
  );
});

hotelViewEventWorker.on('error', (err) => {
  logger.error('Hotel view event worker error:', err);
});

hotelViewEventWorker.on('active', (job) => {
  logger.debug({ jobId: job.id }, `Hotel view event job started: ${job.id}`);
});

module.exports = hotelViewEventWorker;
