require('../register-aliases');

const http = require('http');
const logger = require('@config/logger.config');
const { registerTransport } = require('@platform/events');
const natsTransport = require('@events/nats.adapter');
const redisHoldTransport = require('@platform/events/transports/redis-hold');
const { jobs } = require('@modules/booking');

const workers = [jobs.holdExpiry.createWorker(), jobs.bookingExpiry.createWorker()];

let healthServer;

function startHealthServer() {
  const port = parseInt(process.env.WORKER_HEALTH_PORT || '4001', 10);

  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          workerCount: workers.length,
          queues: workers.map((w) => w.name),
        })
      );
    } else {
      res.writeHead(404);
      res.end();
    }
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
