const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const holdExpiryQueue = new Queue('holdExpiry', {
  connection: config.connection,
  defaultJobOptions: {
    ...config.defaultJobOptions,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

holdExpiryQueue.on('error', (error) => {
  logger.error('Hold expiry queue error:', error);
});

async function scheduleHoldExpiryScanner() {
  const every = parseInt(process.env.HOLD_EXPIRY_SCAN_INTERVAL_MS || '30000', 10);

  return holdExpiryQueue.add(
    'scan-expired-holds',
    {},
    {
      jobId: 'hold-expiry-scanner',
      repeat: { every },
      removeOnComplete: true,
      removeOnFail: {
        age: 86400,
      },
    }
  );
}

module.exports = holdExpiryQueue;
module.exports.scheduleHoldExpiryScanner = scheduleHoldExpiryScanner;
