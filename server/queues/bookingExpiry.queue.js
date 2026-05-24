const { Queue } = require('bullmq');
const config = require('@config/bullmq.config');
const logger = require('@config/logger.config');

const bookingExpiryQueue = new Queue('bookingExpiry', {
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

bookingExpiryQueue.on('error', (error) => {
  logger.error('Booking expiry queue error:', error);
});

async function scheduleBookingExpiryScanner() {
  const every = parseInt(process.env.BOOKING_EXPIRY_SCAN_INTERVAL_MS || '30000', 10);

  return bookingExpiryQueue.add(
    'scan-expired-bookings',
    {},
    {
      jobId: 'booking-expiry-scanner',
      repeat: { every },
      removeOnComplete: true,
      removeOnFail: {
        age: 86400,
      },
    }
  );
}

module.exports = bookingExpiryQueue;
module.exports.scheduleBookingExpiryScanner = scheduleBookingExpiryScanner;
