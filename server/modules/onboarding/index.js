const joinService = require('./application/join.service');
const joinRoutes = require('./api/join.routes');

/**
 * Onboarding module - public interface.
 *
 * Owns the partner "become a host" flow (join form + photo upload). NOTE: the
 * join repository still writes catalog/inventory-owned tables (hotels, rooms,
 * room_inventories) directly; that cross-context write is tracked debt to be
 * replaced by the catalog/inventory public APIs.
 */
module.exports = {
  // HTTP edge (mounted by routes/v1/index.js).
  joinRoutes,

  // Join use-cases (join.service.js).
  join: joinService,
};
