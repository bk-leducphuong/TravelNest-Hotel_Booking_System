const { EventEmitter } = require('events');

const {
  createMetrics,
  getMetrics,
  instrumentRedisClient,
  instrumentWorker,
  metricsMiddleware,
  recordBookingCheckout,
  recordBookingConfirmation,
  wrapSequelizeLogging,
} = require('@platform/metrics');
const { secondsBetween } = require('@platform/metrics/infrastructure/business.metrics');
const { sqlOperation } = require('@platform/metrics/infrastructure/db.metrics');
const { normalizeCommand } = require('@platform/metrics/infrastructure/redis.metrics');

function createResponse(statusCode = 200) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  return res;
}

async function scrape() {
  return getMetrics().registry.metrics();
}

function resetMetrics() {
  const metrics = getMetrics();
  metrics.httpDuration.reset();
  metrics.httpRequests.reset();
  metrics.dbDuration.reset();
  metrics.redisDuration.reset();
  metrics.jobDuration.reset();
  metrics.bookingCheckoutDuration.reset();
  metrics.bookingConfirmationDuration.reset();
  metrics.bookingConfirmationProcessing.reset();
}

describe('platform/metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('registry factory', () => {
    it('builds independent registries without duplicate metric errors', async () => {
      const first = createMetrics({ collectDefault: false });
      const second = createMetrics({ collectDefault: false });

      expect(first.registry).not.toBe(second.registry);
      expect(await first.registry.getSingleMetric('http_request_duration_seconds')).toBeDefined();
      expect(await second.registry.getSingleMetric('http_request_duration_seconds')).toBeDefined();
    });
  });

  describe('metricsMiddleware', () => {
    it('labels requests with the route pattern, not the concrete URL', async () => {
      const req = {
        method: 'GET',
        path: '/api/v1/hotels/42/rooms',
        baseUrl: '/api/v1',
        route: { path: '/hotels/:id/rooms' },
      };
      const res = createResponse(200);
      const next = jest.fn();

      metricsMiddleware(req, res, next);
      res.emit('finish');

      expect(next).toHaveBeenCalledTimes(1);

      const body = await scrape();
      expect(body).toContain('route="/api/v1/hotels/:id/rooms"');
      expect(body).not.toContain('route="/api/v1/hotels/42');
      expect(body).toContain(
        'http_requests_total{method="GET",route="/api/v1/hotels/:id/rooms",status_class="2xx"} 1'
      );
    });

    it('collapses unmatched requests into a single label value', async () => {
      const req = { method: 'GET', path: '/definitely/not/a/route' };
      const res = createResponse(404);

      metricsMiddleware(req, res, jest.fn());
      res.emit('finish');

      const body = await scrape();
      expect(body).toContain('route="unmatched"');
      expect(body).toContain('status_class="4xx"');
    });

    it('ignores health, metrics and docs traffic', async () => {
      ['/health/live', '/health', '/metrics', '/api-docs/', '/admin/queues'].forEach((path) => {
        const req = { method: 'GET', path, route: { path } };
        const res = createResponse(200);

        metricsMiddleware(req, res, jest.fn());
        res.emit('finish');
      });

      const body = await scrape();
      expect(body).not.toContain('http_request_duration_seconds_count{method="GET",route="/health');
      expect(body).not.toContain('http_requests_total{');
    });
  });

  describe('database metrics', () => {
    it('maps SQL statements to a bounded operation label', () => {
      expect(sqlOperation('SELECT * FROM hotels')).toBe('select');
      expect(sqlOperation('  insert into bookings')).toBe('insert');
      expect(sqlOperation('START TRANSACTION')).toBe('start');
      expect(sqlOperation('SOME NEW STATEMENT')).toBe('other');
      expect(sqlOperation(null)).toBe('other');
    });

    it('records query timing and keeps the user logging callback', async () => {
      const userLogging = jest.fn();
      const logging = wrapSequelizeLogging(userLogging);

      logging('SELECT 1', 12);
      logging('SELECT 2');

      expect(userLogging).toHaveBeenCalledWith('SELECT 1', 12);
      const body = await scrape();
      expect(body).toContain('db_query_duration_seconds_count{operation="select"} 1');
    });
  });

  describe('redis metrics', () => {
    it('maps commands to a bounded label value', () => {
      expect(normalizeCommand(['GET', 'key'])).toBe('get');
      expect(normalizeCommand(['XUNKNOWNCOMMAND'])).toBe('other');
      expect(normalizeCommand([])).toBe('other');
    });

    it('times every sendCommand call and is idempotent', async () => {
      const client = {
        sendCommand: jest.fn().mockResolvedValue('OK'),
      };

      instrumentRedisClient(client);
      instrumentRedisClient(client);

      await client.sendCommand(['SET', 'key', 'value']);
      await client.sendCommand(['GET', 'key']);

      const body = await scrape();
      expect(body).toContain('redis_command_duration_seconds_count{command="set"} 1');
      expect(body).toContain('redis_command_duration_seconds_count{command="get"} 1');
    });

    it('records failed commands before rethrowing', async () => {
      const client = {
        sendCommand: jest.fn().mockRejectedValue(new Error('boom')),
      };

      instrumentRedisClient(client);

      await expect(client.sendCommand(['GET', 'key'])).rejects.toThrow('boom');

      const body = await scrape();
      expect(body).toContain('redis_command_duration_seconds_count{command="get"} 1');
    });
  });

  describe('queue metrics', () => {
    it('records completed job duration from BullMQ timestamps', async () => {
      const worker = new EventEmitter();
      worker.name = 'holdExpiry';

      instrumentWorker(worker);
      worker.emit('completed', {
        name: 'scan-expired-holds',
        processedOn: 1000,
        finishedOn: 2500,
      });

      const body = await scrape();
      expect(body).toContain(
        'job_duration_seconds_count{queue="holdExpiry",job="scan-expired-holds",status="completed"} 1'
      );
    });

    it('records failed attempts without double-instrumenting', async () => {
      const worker = new EventEmitter();
      worker.name = 'refundRecovery';

      instrumentWorker(worker);
      instrumentWorker(worker);
      worker.emit('failed', {
        name: 'recover-refunds',
        processedOn: 1000,
        finishedOn: 1500,
      });

      const body = await scrape();
      expect(body).toContain(
        'job_duration_seconds_count{queue="refundRecovery",job="recover-refunds",status="failed"} 1'
      );
    });

    it('ignores jobs without timestamps', async () => {
      const worker = new EventEmitter();
      worker.name = 'refundReconciliation';

      instrumentWorker(worker);
      worker.emit('completed', { name: 'reconcile-refunds' });

      const body = await scrape();
      expect(body).not.toContain('job_duration_seconds_count{job="reconcile-refunds"');
    });
  });

  describe('booking flow metrics', () => {
    it('computes durations and rejects invalid ranges', () => {
      expect(secondsBetween(new Date(0), new Date(5000))).toBe(5);
      expect(secondsBetween(new Date(5000), new Date(0))).toBeNull();
      expect(secondsBetween(null, new Date(0))).toBeNull();
      expect(secondsBetween('not-a-date', new Date(0))).toBeNull();
    });

    it('records the checkout stage after a booking is created', async () => {
      recordBookingCheckout({
        flow: 'prepay',
        holdCreatedAt: new Date(1_000_000),
        bookingCreatedAt: new Date(1_045_000),
      });

      const body = await scrape();
      expect(body).toContain('booking_checkout_duration_seconds_count{flow="prepay"} 1');
      expect(body).toContain('booking_checkout_duration_seconds_sum{flow="prepay"} 45');
    });

    it('records hold-to-confirmation and webhook processing separately', async () => {
      recordBookingConfirmation({
        flow: 'prepay',
        holdCreatedAt: new Date(1_000_000),
        bookingCreatedAt: new Date(1_045_000),
        confirmedAt: new Date(1_300_000),
        processingStartedAt: new Date(1_299_000),
      });

      const body = await scrape();
      // Business SLA starts at the hold, not at booking creation.
      expect(body).toContain('booking_confirmation_duration_seconds_count{flow="prepay"} 1');
      expect(body).toContain('booking_confirmation_duration_seconds_sum{flow="prepay"} 300');
      expect(body).toContain('booking_confirmation_processing_seconds_count{flow="prepay"} 1');
      expect(body).toContain('booking_confirmation_processing_seconds_sum{flow="prepay"} 1');
    });

    it('falls back to booking creation when the hold timestamp is missing', async () => {
      recordBookingConfirmation({
        holdCreatedAt: null,
        bookingCreatedAt: new Date(2_000_000),
        confirmedAt: new Date(2_060_000),
      });

      const body = await scrape();
      expect(body).toContain('booking_confirmation_duration_seconds_sum{flow="prepay"} 60');
      expect(body).not.toContain('booking_confirmation_processing_seconds_count{flow="prepay"} 1');
    });

    it('skips observations when timestamps are missing', async () => {
      recordBookingCheckout({ holdCreatedAt: null, bookingCreatedAt: null });
      recordBookingConfirmation({ holdCreatedAt: null, bookingCreatedAt: null });

      const body = await scrape();
      expect(body).not.toContain('booking_checkout_duration_seconds_count{flow="prepay"} 1');
      expect(body).not.toContain('booking_confirmation_duration_seconds_count{flow="prepay"} 1');
    });
  });
});
