const { getHealthStatus } = require('./application/getHealthStatus');
const { getLiveness } = require('./application/getLiveness');
const { getReadiness } = require('./application/getReadiness');
const healthRoutes = require('./api/health.routes');

/**
 * Health platform component - public interface.
 *
 * Cross-cutting health checks for the HTTP liveness/readiness probes.
 */
module.exports = {
  healthRoutes,
  getHealthStatus,
  getLiveness,
  getReadiness,
};
