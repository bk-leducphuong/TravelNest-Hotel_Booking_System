const { getMetrics } = require('../infrastructure/registry');

/**
 * Paths that must not pollute latency percentiles:
 * - `/health/*` is polled by the kubelet every 10s and is always fast.
 * - `/metrics` is the scrape endpoint itself.
 * - `/admin/queues` is an operator-only dashboard.
 * - `/api-docs` serves static Swagger assets.
 */
const EXCLUDED_PREFIXES = ['/health', '/metrics', '/admin/queues', '/api-docs'];

function isExcludedPath(pathname) {
  return EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Resolve a bounded route label.
 *
 * `req.route.path` is the pattern (`/hotels/:id/rooms`), not the concrete URL,
 * so identifiers never become labels. Unmatched requests collapse to a single
 * value instead of one series per 404 path.
 */
function resolveRoute(req) {
  if (req.route && req.route.path) {
    return `${req.baseUrl || ''}${req.route.path}`;
  }

  return 'unmatched';
}

function statusClass(statusCode) {
  return `${Math.floor(statusCode / 100)}xx`;
}

/**
 * Record duration and status for every request that reaches the app.
 *
 * `finish` fires once the response has been flushed, which matches what the
 * client experiences as server time (network time excluded).
 */
function metricsMiddleware(req, res, next) {
  if (isExcludedPath(req.path)) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = resolveRoute(req);
    const method = req.method;
    const { httpDuration, httpRequests } = getMetrics();

    httpDuration.observe({ method, route }, seconds);
    httpRequests.inc({
      method,
      route,
      status_class: statusClass(res.statusCode),
    });
  });

  return next();
}

module.exports = {
  EXCLUDED_PREFIXES,
  isExcludedPath,
  metricsMiddleware,
  resolveRoute,
  statusClass,
};
