require('module-alias/register');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development',
});

const logger = require('@config/logger.config');

const imageWorker = require('./image.worker');
const hotelSnapshotWorker = require('./hotelSnapshot.worker');
const searchLogWorker = require('./searchLog.worker');
const emailWorker = require('./email.worker');
const notificationWorker = require('./notification.worker');

const workers = [
  imageWorker,
  hotelSnapshotWorker,
  searchLogWorker,
  emailWorker,
  notificationWorker,
];

async function startWorkers() {
  try {
    await Promise.all(workers.map((worker) => worker.run()));

    logger.info('All BullMQ workers started', {
      workerCount: workers.length,
      queues: workers.map((w) => w.name),
    });
  } catch (error) {
    logger.error('Failed to start workers:', error);
    throw error;
  }
}

async function shutdownWorkers() {
  try {
    logger.info('Shutting down BullMQ workers...');

    await Promise.all(
      workers.map(async (worker) => {
        await worker.close();
        logger.info(`Worker closed: ${worker.name}`);
      })
    );

    logger.info('All workers shut down successfully');
  } catch (error) {
    logger.error('Error during worker shutdown:', error);
    throw error;
  }
}

startWorkers().catch((err) => {
  logger.error('Worker startup failed:', err);
  process.exit(1);
});

['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach((signal) => {
  process.once(signal, async () => {
    logger.info(`Received ${signal}, shutting down...`);
    await shutdownWorkers();
    process.exit(0);
  });
});

process.on('unhandledRejection', async (err) => {
  logger.error('Unhandled rejection:', err);
  await shutdownWorkers();
  process.exit(1);
});

process.on('uncaughtException', async (err) => {
  logger.error('Uncaught exception:', err);
  await shutdownWorkers();
  process.exit(1);
});
