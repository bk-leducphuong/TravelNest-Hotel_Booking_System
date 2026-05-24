const imageProcessingQueue = require('./imageProcessing.queue');
const hotelSnapshotQueue = require('./hotelSnapshot.queue');
const searchLogQueue = require('./searchLog.queue');
const hotelViewEventQueue = require('./hotelViewEvent.queue');
const emailQueue = require('./email.queue');
const notificationQueue = require('./notification.queue');
const holdExpiryQueue = require('./holdExpiry.queue');
const bookingExpiryQueue = require('./bookingExpiry.queue');

module.exports = {
  imageProcessingQueue,
  hotelSnapshotQueue,
  searchLogQueue,
  hotelViewEventQueue,
  emailQueue,
  notificationQueue,
  holdExpiryQueue,
  bookingExpiryQueue,
};
