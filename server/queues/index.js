const imageProcessingQueue = require('./imageProcessing.queue');
const hotelSnapshotQueue = require('./hotelSnapshot.queue');
const searchLogQueue = require('./searchLog.queue');
const paymentNotificationQueue = require('./paymentNotification.queue');

module.exports = {
  imageProcessingQueue,
  hotelSnapshotQueue,
  searchLogQueue,
  paymentNotificationQueue,
};
