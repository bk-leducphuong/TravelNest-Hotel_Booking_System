const { v4: uuidv4 } = require('uuid');

const { publish, INTEGRATION_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

const MODES = new Set(['walking', 'driving', 'transit']);
const SOURCES = new Set(['gps', 'ip', 'none']);

/**
 * Publish a "directions clicked" event. Coordinates are intentionally not
 * included: the destination is derivable from the hotel id and we never log
 * the guest's origin.
 */
async function publishDirectionsClick({
  hotelId,
  mode = 'walking',
  source = 'none',
  userId = null,
}) {
  if (!hotelId) return null;

  try {
    const eventId = uuidv4();

    await publish(
      INTEGRATION_EVENTS.DIRECTIONS_CLICKED,
      {
        hotelId,
        mode: MODES.has(mode) ? mode : 'walking',
        source: SOURCES.has(source) ? source : 'none',
        userId,
      },
      { eventId }
    );

    return { eventId };
  } catch (error) {
    logger.error(
      { err: error?.message, hotelId, mode, source },
      'Failed to publish directions click event'
    );
    return null;
  }
}

module.exports = { publishDirectionsClick };
