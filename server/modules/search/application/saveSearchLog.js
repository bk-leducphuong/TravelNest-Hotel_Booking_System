const { v4: uuidv4 } = require('uuid');

const { publish, INTEGRATION_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

const GEO_PRECISION = 3;

function roundCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  const factor = 10 ** GEO_PRECISION;
  return Math.round(numberValue * factor) / factor;
}

/**
 * Publish a search-performed event for the analytics pipeline.
 * Called both by the hotel GET controller and the explicit POST /search/log
 * endpoint. publish() hands the event to platform transports; this function
 * does not insert an analytics table row. Search results can be returned before
 * the GET controller's logging promise settles.
 * Best-effort: returns null on failure.
 */
async function saveSearchLog(searchData, userId = null, metadata = {}) {
  try {
    // Each invocation receives its own event ID; separate GET/POST logging
    // calls are not deduplicated here. Coordinates are rounded before leaving
    // the module, and the payload contains no raw user IP address.
    const eventId = uuidv4();
    const occurredAt = new Date();
    const radius = Number(searchData.radius);

    await publish(
      INTEGRATION_EVENTS.SEARCH_PERFORMED,
      {
        userId,
        destinationId: searchData.destinationId || null,
        destinationType: searchData.destinationType || searchData.destination_type || '',
        latitude: roundCoordinate(searchData.latitude),
        longitude: roundCoordinate(searchData.longitude),
        radius: Number.isFinite(radius) && radius > 0 ? radius : null,
        locationSource: searchData.locationSource || null,
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
