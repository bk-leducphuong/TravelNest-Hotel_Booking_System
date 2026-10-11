const superadminRoutes = require('./api/superadmin.routes');

/**
 * Superadmin module - platform-wide, cross-tenant monitoring (read-only).
 *
 * Mounted at `/api/v1/superadmin`. Distinct from:
 *  - `/api/v1/admin/*`              hotel back-office (hotel-scoped)
 *  - `/api/v1/internal/superadmin/*` operator/infra ops (token-gated)
 *
 * Other modules must only use what is exported here.
 */
module.exports = {
  superadminRoutes,
};
