const find = require('./room_inventory/find');
const write = require('./room_inventory/write');
const reserved = require('./room_inventory/reserved');
const held = require('./room_inventory/held');
const availability = require('./room_inventory/availability');

/**
 * Inventory room-inventory repository (aggregate).
 *
 * The implementation is split by concern under ./room_inventory/. Inventory
 * owns the room_inventory table; other contexts reach it via @modules/inventory.
 */
module.exports = {
  ...find,
  ...write,
  ...reserved,
  ...held,
  ...availability,
};
