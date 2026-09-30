const { getHealthStatus } = require('./application/getHealthStatus');
const { getLiveness } = require('./application/getLiveness');
const { getReadiness } = require('./application/getReadiness');

/**
 * Health platform component - public interface.
 *
 * Cross-cutting health checks for the HTTP liveness/readiness probes.
 */
module.exports = {
  getHealthStatus,
  getLiveness,
  getReadiness,
};
