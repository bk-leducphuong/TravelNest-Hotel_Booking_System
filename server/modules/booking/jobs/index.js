const holdExpiryQueue = require('./holdExpiry.queue');
const bookingExpiryQueue = require('./bookingExpiry.queue');
const { createHoldExpiryWorker } = require('./holdExpiry.worker');
const { createBookingExpiryWorker } = require('./bookingExpiry.worker');

/**
 * Booking module background jobs.
 *
 * Queues are safe to build at import time (the API process mounts them in Bull
 * Board), but workers are exposed as factories so they are only constructed by
 * the worker process.
 */
module.exports = {
  holdExpiry: {
    queue: holdExpiryQueue,
    schedule: holdExpiryQueue.scheduleHoldExpiryScanner,
    createWorker: createHoldExpiryWorker,
  },
  bookingExpiry: {
    queue: bookingExpiryQueue,
    schedule: bookingExpiryQueue.scheduleBookingExpiryScanner,
    createWorker: createBookingExpiryWorker,
  },
};
