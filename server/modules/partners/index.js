const guestRoutes = require('./api/partners.routes');
const { getPartnerLink, SERVICES, SUPPORTED_SERVICES } = require('./application/getPartnerLink');

/**
 * Partners module - public interface.
 *
 * Owns outbound affiliate integrations (flights, airport transfers, and any
 * service added to the registry later). The guest client asks this module for a
 * deep link instead of rebuilding affiliate ids in the bundle.
 */
module.exports = {
  // HTTP edge.
  guestRoutes,

  // Deep-link builder and service registry.
  getPartnerLink,
  SERVICES,
  SUPPORTED_SERVICES,
};
