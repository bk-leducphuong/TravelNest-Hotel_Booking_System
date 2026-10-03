const joinService = require('./application/join.service');
const joinRoutes = require('./api/join.routes');

/**
 * Onboarding module - public interface.
 *
 * Owns the partner "become a host" flow (join form + photo upload). It creates
 * the hotel/room/inventory through the catalog and inventory public APIs.
 */
module.exports = {
  // HTTP edge (mounted by routes/v1/index.js).
  joinRoutes,

  // Join use-cases (join.service.js).
  join: joinService,
};
