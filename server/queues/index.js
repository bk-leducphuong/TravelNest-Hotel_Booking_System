const hotelSnapshotQueue = require('./hotelSnapshot.queue');
const emailQueue = require('./email.queue');
const notificationQueue = require('./notification.queue');
const holdExpiryQueue = require('./holdExpiry.queue');
const bookingExpiryQueue = require('./bookingExpiry.queue');

module.exports = {
  hotelSnapshotQueue,
  emailQueue,
  notificationQueue,
  holdExpiryQueue,
  bookingExpiryQueue,
};
