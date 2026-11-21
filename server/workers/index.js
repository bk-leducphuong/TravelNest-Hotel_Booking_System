require('../register-aliases');

const http = require('http');
const logger = require('@config/logger.config');
const { registerTransport } = require('@platform/events');
const natsTransport = require('@events/nats.adapter');
const redisHoldTransport = require('@platform/events/transports/redis-hold');
const { jobs } = require('@modules/booking');
const paymentModule = require('@modules/payment');
const promotionModule = require('@modules/promotion');
const superadminModule = require('@modules/superadmin');
const { getMetrics, instrumentQueueDepths, instrumentWorker } = require('@platform/metrics');
const payoutModule = require('@modules/payout');

const payoutJobs = payoutModule.jobs.payouts;

const workers = [
  jobs.holdExpiry.createWorker(),
  jobs.bookingExpiry.createWorker(),
  paymentModule.jobs.refunds.createWorker(),
  paymentModule.jobs.refunds.createReconciliationWorker(),
  promotionModule.jobs.promotionReconcile.createWorker(),
  superadminModule.jobs.platformStatsRefresh.createWorker(),
  payoutJobs.createGenerationWorker(),
  payoutJobs.createProcessingWorker(),
  payoutJobs.createRecoveryWorker(),
];

// Job duration histograms, scraped from the same port as the health check.
workers.forEach((worker) => instrumentWorker(worker));

let healthServer;

function startHealthServer() {
  const port = parseInt(process.env.WORKER_HEALTH_PORT || '4001', 10);

  const server = http.createServer(async (req, res) => {
    const pathname = (req.url || '').split('?')[0];

    if (pathname === '/health' || pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          workerCount: workers.length,
          queues: workers.map((w) => w.name),
        })
      );
      return;
    }

    if (pathname === '/metrics') {
      try {
        const registry = getMetrics().registry;
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
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'BullMQ worker health server listening');
  });

  return server;
}

async function startWorkers() {
  try {
    registerTransport(natsTransport);
    registerTransport(redisHoldTransport);
    await natsTransport.connect();

    await jobs.holdExpiry.schedule();
    await jobs.bookingExpiry.schedule();
    await paymentModule.jobs.refunds.schedule();
    await promotionModule.jobs.promotionReconcile.schedule();
    await superadminModule.jobs.platformStatsRefresh.schedule();
    await payoutJobs.schedule();

    // Queue depth is scraped from the health port. Queues hold Redis
    // connections, so reuse the instances the workers already use.
    const queues = [
      jobs.holdExpiry.queue,
      jobs.bookingExpiry.queue,
      paymentModule.jobs.refunds.getQueue(),
      paymentModule.jobs.refunds.getReconciliationQueue(),
      promotionModule.jobs.promotionReconcile.queue,
      superadminModule.jobs.platformStatsRefresh.queue,
      payoutJobs.getQueue(payoutJobs.QUEUES.GENERATION),
      payoutJobs.getQueue(payoutJobs.QUEUES.PROCESSING),
      payoutJobs.getQueue(payoutJobs.QUEUES.RECOVERY),
    ];
    instrumentQueueDepths(() => queues);

    // Worker.run() is a blocking main loop that only resolves once the worker
    // closes, so start it without awaiting and wait for readiness instead —
    // otherwise the health server below never starts and the liveness probe
    // restarts the pod forever.
    workers.forEach((worker) => {
      worker.run().catch((error) => {
        logger.error(`Worker ${worker.name} stopped unexpectedly:`, error);
        process.exitCode = 1;
      });
    });
    await Promise.all(workers.map((worker) => worker.waitUntilReady()));

    logger.info('All BullMQ workers started', {
      workerCount: workers.length,
      queues: workers.map((w) => w.name),
    });

    healthServer = startHealthServer();
  } catch (error) {
    logger.error('Failed to start workers:', error);
    throw error;
  }
}

async function shutdownWorkers() {
  try {
    logger.info('Shutting down BullMQ workers...');

    await Promise.all(
      workers.map(async (worker) => {
        await worker.close();
        logger.info(`Worker closed: ${worker.name}`);
      })
    );

    if (healthServer) {
      await new Promise((resolve) => healthServer.close(resolve));
      logger.info('BullMQ worker health server closed');
    }

    await natsTransport.close();

    logger.info('All workers shut down successfully');
  } catch (error) {
    logger.error('Error during worker shutdown:', error);
    throw error;
  }
}

startWorkers().catch((err) => {
  logger.error('Worker startup failed:', err);
  process.exit(1);
});

['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach((signal) => {
  process.once(signal, async () => {
    logger.info(`Received ${signal}, shutting down...`);
    await shutdownWorkers();
    process.exit(0);
  });
});

process.on('unhandledRejection', async (err) => {
  logger.error('Unhandled rejection:', err);
  await shutdownWorkers();
  process.exit(1);
});

process.on('uncaughtException', async (err) => {
  logger.error('Uncaught exception:', err);
  await shutdownWorkers();
  process.exit(1);
});
