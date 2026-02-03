const logger = require('@config/logger.config');

const TOPICS = {
  // Image processing
  imageProcessing: 'image.processing',
  // Hotel search snapshot
  hotelSearchSnapshot: 'hotel-search-snapshot-events',
};

const topicFor = (topicName) => {
  const topic = TOPICS[topicName];
  if (!topic) {
    logger.error(`Unknown topic: ${topicName}`);
    throw new Error(`Unknown topic: ${topicName}`);
  }
};

module.exports = { topicFor };
