const find = require('./room_inventory/find');
const write = require('./room_inventory/write');
const reserved = require('./room_inventory/reserved');
const held = require('./room_inventory/held');
const availability = require('./room_inventory/availability');

/**
 * Room Inventory Repository (aggregate).
 *
 * The implementation is split by concern under ./room_inventory/; this barrel
 * keeps the public path `@repositories/room_inventory.repository` stable.
 */
module.exports = {
  ...find,
  ...write,
  ...reserved,
  ...held,
  ...availability,
};
