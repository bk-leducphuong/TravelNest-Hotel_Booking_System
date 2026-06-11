const hotelSnapshotQueue = require('./hotelSnapshot.queue');
const holdExpiryQueue = require('./holdExpiry.queue');
const bookingExpiryQueue = require('./bookingExpiry.queue');

module.exports = {
  hotelSnapshotQueue,
  holdExpiryQueue,
  bookingExpiryQueue,
};
