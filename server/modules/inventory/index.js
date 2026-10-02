const adminRoutes = require('./api/admin.routes');
const roomInventoryRepository = require('./infrastructure/room_inventory.repository');
const { registerInventorySubscribers } = require('./events/subscribers');
const { reserveRooms } = require('./application/guest/reserveRooms');
const { releaseRooms } = require('./application/guest/releaseRooms');
const { checkAvailability } = require('./application/guest/checkAvailability');
const { getInventoryDetails } = require('./application/guest/getInventoryDetails');
const { checkAvailabilityForHold } = require('./application/guest/checkAvailabilityForHold');
const { holdRooms } = require('./application/guest/holdRooms');
const { releaseHoldRooms } = require('./application/guest/releaseHoldRooms');

// Register once per process (guarded).
registerInventorySubscribers();

/**
 * Read raw inventory rows for rooms over a date range (used by pricing).
 */
async function getInventoryForDateRange(roomIds, startDate, endDate) {
  return await roomInventoryRepository.findByRoomsAndDateRange(roomIds, startDate, endDate);
}

/**
 * Inventory module - public interface.
 *
 * Owns room inventory: reservation/release, held-room bookkeeping and
 * availability. Other modules and the legacy services call it through here,
 * never its repositories directly.
 */
module.exports = {
  adminRoutes,
  reserveRooms,
  releaseRooms,
  checkAvailability,
  getInventoryDetails,
  checkAvailabilityForHold,
  holdRooms,
  releaseHoldRooms,
  getInventoryForDateRange,
};
