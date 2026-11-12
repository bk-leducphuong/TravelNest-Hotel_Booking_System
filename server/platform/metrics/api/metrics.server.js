const http = require('http');

const logger = require('../../../config/logger.config');
const { getMetrics } = require('../infrastructure/registry');

const DEFAULT_METRICS_PORT = 9464;

function resolvePort(port) {
  const value = port !== undefined ? port : process.env.METRICS_PORT;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_METRICS_PORT;
}

/**
 * Serve Prometheus metrics on a dedicated port.
 *
 * Kept off the public API port on purpose: it bypasses CORS, auth and the rate
 * limiter, and is only reachable from inside the cluster.
 *
 * @param {{ port?: number, registry?: object }} [options]
 * @returns {import('http').Server}
 */
function startMetricsServer({ port, registry = getMetrics().registry } = {}) {
  const listenPort = resolvePort(port);

  const server = http.createServer(async (req, res) => {
    const pathname = (req.url || '').split('?')[0];

    if (pathname !== '/metrics') {
      res.writeHead(404);
      res.end();
      return;
    }

    try {
      const body = await registry.metrics();
      res.writeHead(200, {
        'Content-Type': registry.contentType,
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to render Prometheus metrics');
      res.writeHead(500);
      res.end();
    }
  });

  // Never take the API down because the metrics port is unavailable: losing
  // telemetry is bad, losing bookings is worse.
  server.on('error', (error) => {
    logger.error({ error: error.message, port: listenPort }, 'Metrics server error');
  });

  server.listen(listenPort, '0.0.0.0', () => {
    logger.info({ port: listenPort }, 'Prometheus metrics server listening');
  });

  return server;
}

module.exports = {
  DEFAULT_METRICS_PORT,
  resolvePort,
  startMetricsServer,
};
