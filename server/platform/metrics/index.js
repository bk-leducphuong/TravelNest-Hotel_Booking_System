const { metricsMiddleware } = require('./api/metrics.middleware');
const { startMetricsServer } = require('./api/metrics.server');
const {
  recordBookingCheckout,
  recordBookingConfirmation,
} = require('./infrastructure/business.metrics');
const { wrapSequelizeLogging } = require('./infrastructure/db.metrics');
const { instrumentQueueDepths } = require('./infrastructure/queue-depth.metrics');
const { instrumentSequelizePool } = require('./infrastructure/pool.metrics');
const { instrumentWorker } = require('./infrastructure/queue.metrics');
const { instrumentRedisClient } = require('./infrastructure/redis.metrics');
const { createMetrics, getMetrics } = require('./infrastructure/registry');

/**
 * Metrics platform component - public interface.
 *
 * Histograms and counters are exposed on a dedicated port and scraped by the
 * cluster's Alloy collector (see deploy/k8s/monitoring).
 */
module.exports = {
  createMetrics,
  getMetrics,
  instrumentQueueDepths,
  instrumentRedisClient,
  instrumentSequelizePool,
  instrumentWorker,
  metricsMiddleware,
  recordBookingCheckout,
  recordBookingConfirmation,
  startMetricsServer,
  wrapSequelizeLogging,
};
