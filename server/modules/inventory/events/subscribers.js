const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

let registered = false;

async function refreshHotelSearchSnapshot({ hotelId, roomId }) {
  if (!hotelId || !roomId) {
    return;
  }

  try {
    const { emitRoomInventoryChanged } = require('@utils/hotel_snapshot_events.utils');
    await emitRoomInventoryChanged(hotelId, roomId);
  } catch (error) {
    logger.warn(
      { error: error.message, hotelId, roomId },
      'Failed to refresh hotel snapshot after inventory change'
    );
  }
}

/**
 * Wire inventory-domain subscribers. Safe to call more than once.
 */
function registerInventorySubscribers() {
  if (registered) {
    return;
  }
  registered = true;

  eventBus.subscribe(DOMAIN_EVENTS.INVENTORY_CHANGED, refreshHotelSearchSnapshot);

  logger.info('Inventory module event subscribers registered');
}

module.exports = { registerInventorySubscribers };
