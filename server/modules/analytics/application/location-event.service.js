const { v4: uuidv4 } = require('uuid');

const { publish, INTEGRATION_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

const LOCATION_EVENTS = new Set([
  'permission_prompted',
  'granted',
  'denied',
  'error',
  'approximate_used',
  'approximate_unavailable',
]);

/**
 * Publish a geolocation funnel event for the analytics pipeline.
 *
 * The browser owns the permission prompt; this event lets the product measure
 * the drop-off between requesting a location, granting it, and falling back to
 * the network-level hint. Best-effort: returns null on failure.
 */
async function publishLocationEvent({
  event,
  source = 'browser',
  errorCode = null,
  userId = null,
}) {
  if (!LOCATION_EVENTS.has(event)) return null;

  try {
    const eventId = uuidv4();

    await publish(
      INTEGRATION_EVENTS.LOCATION_PERMISSION,
      {
        event,
        source,
        errorCode: errorCode || null,
        userId,
      },
      { eventId }
    );

    return { eventId };
  } catch (error) {
    logger.error(
      { err: error?.message, event, source },
      'Failed to publish geolocation funnel event'
    );
    return null;
  }
}

module.exports = { publishLocationEvent, LOCATION_EVENTS };
