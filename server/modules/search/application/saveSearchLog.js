const { v4: uuidv4 } = require('uuid');

const { publish, INTEGRATION_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

/**
 * Publish a search-performed event for the analytics pipeline.
 * Best-effort: returns null on failure.
 */
async function saveSearchLog(searchData, userId = null, metadata = {}) {
  try {
    const eventId = uuidv4();
    const occurredAt = new Date();

    await publish(
      INTEGRATION_EVENTS.SEARCH_PERFORMED,
      {
        userId,
        destinationId: searchData.destinationId || null,
        destinationType: searchData.destinationType || searchData.destination_type || '',
        checkInDate: searchData.checkIn,
        checkOutDate: searchData.checkOut,
        adults: searchData.adults,
        children: searchData.children || 0,
        rooms: searchData.rooms || 1,
      },
      { eventId, occurredAt, correlationId: metadata.correlationId }
    );

    return { eventId };
  } catch (error) {
    logger.error(error, 'Failed to publish search log:');
    return null;
  }
}

module.exports = { saveSearchLog };
