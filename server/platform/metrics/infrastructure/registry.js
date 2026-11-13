const client = require('prom-client');

/**
 * Shared histogram buckets, in seconds.
 *
 * One set covers everything this process measures: sub-millisecond Redis
 * calls, ~10ms MySQL reads, hundreds of milliseconds for search, and
 * multi-second booking writes. A single set keeps the series count bounded
 * and makes `histogram_quantile` results comparable across metrics.
 */
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 2, 3, 5, 10];

/** Job durations are coarser: cron-style workers run for seconds. */
const JOB_BUCKETS = [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60, 300];

/**
 * Build an isolated metrics registry.
 *
 * Tests and one-off scripts use the factory so they never collide with the
 * process-wide registry (prom-client throws on duplicate metric names).
 *
 * @param {{ collectDefault?: boolean }} [options]
 */
function createMetrics({ collectDefault = true } = {}) {
  const registry = new client.Registry();

  if (collectDefault) {
    client.collectDefaultMetrics({ register: registry });
  }

  const httpDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration, labelled by the resolved Express route pattern',
    labelNames: ['method', 'route'],
    buckets: DEFAULT_BUCKETS,
    registers: [registry],
  });

  const httpRequests = new client.Counter({
    name: 'http_requests_total',
    help: 'HTTP requests, labelled by the resolved Express route pattern and status class',
    labelNames: ['method', 'route', 'status_class'],
    registers: [registry],
  });

  const dbDuration = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Sequelize query duration in seconds',
    labelNames: ['operation'],
    buckets: DEFAULT_BUCKETS,
    registers: [registry],
  });

  const redisDuration = new client.Histogram({
    name: 'redis_command_duration_seconds',
    help: 'Redis command duration in seconds',
    labelNames: ['command'],
    buckets: DEFAULT_BUCKETS,
    registers: [registry],
  });

  const jobDuration = new client.Histogram({
    name: 'job_duration_seconds',
    help: 'BullMQ job processing duration in seconds',
    labelNames: ['queue', 'job', 'status'],
    buckets: JOB_BUCKETS,
    registers: [registry],
  });

  // Booking flow. `flow` is the payment policy: prepay or pay_at_property.
  const bookingCheckoutDuration = new client.Histogram({
    name: 'booking_checkout_duration_seconds',
    help: 'Time from room hold creation to the pending booking row being created',
    labelNames: ['flow'],
    buckets: [1, 2, 5, 10, 15, 30, 60, 120, 300, 600],
    registers: [registry],
  });

  const bookingConfirmationDuration = new client.Histogram({
    name: 'booking_confirmation_duration_seconds',
    help: 'Time from room hold creation to the booking being confirmed (includes the time the guest spends paying)',
    labelNames: ['flow'],
    buckets: [10, 30, 60, 120, 300, 600, 900, 1800, 3600],
    registers: [registry],
  });

  const bookingConfirmationProcessing = new client.Histogram({
    name: 'booking_confirmation_processing_seconds',
    help: 'Time spent processing a payment-succeeded webhook before commit',
    labelNames: ['flow'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
    registers: [registry],
  });

  return {
    registry,
    httpDuration,
    httpRequests,
    dbDuration,
    redisDuration,
    jobDuration,
    bookingCheckoutDuration,
    bookingConfirmationDuration,
    bookingConfirmationProcessing,
  };
}

let defaultMetrics;

/**
 * Process-wide registry, created on first use.
 */
function getMetrics() {
  if (!defaultMetrics) {
    defaultMetrics = createMetrics();
  }

  return defaultMetrics;
}

module.exports = {
  DEFAULT_BUCKETS,
  JOB_BUCKETS,
  createMetrics,
  getMetrics,
};
