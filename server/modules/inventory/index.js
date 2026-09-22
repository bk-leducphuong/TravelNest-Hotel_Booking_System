const inventoryService = require('@services/inventory.service');
const adminRoutes = require('./api/admin.routes');
const { registerInventorySubscribers } = require('./events/subscribers');

// Register once per process (guarded).
registerInventorySubscribers();

/**
 * Inventory module - public interface.
 *
 * `releaseRooms` / `reserveRooms` are exposed here so other modules (e.g.
 * Booking) call the inventory domain through its interface instead of
 * importing the legacy service. Consolidating the rest of the guest booking
 * path into this module is a follow-up.
 */
module.exports = {
  adminRoutes,
  releaseRooms: inventoryService.releaseRooms.bind(inventoryService),
  reserveRooms: inventoryService.reserveRooms.bind(inventoryService),
  checkAvailability: inventoryService.checkAvailability.bind(inventoryService),
};
