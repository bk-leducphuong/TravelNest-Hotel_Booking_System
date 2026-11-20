require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});
const logger = require('./config/logger.config');
const { validateEnv } = require('./config/validate-env');
const createApp = require('./app');
const { startMetricsServer } = require('./platform/metrics');
const natsTransport = require('./events/nats.adapter');
const PORT = process.env.PORT || 3000;

let httpServer;
let metricsServer;

// Fail fast (production) / warn (otherwise) on missing configuration, instead
// of throwing later when the first request hits the affected code path.
validateEnv({ logger });

createApp()
  .then((app) => {
    httpServer = app.get('httpServer');

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Separate listener so /metrics never goes through the public API surface.
    metricsServer = startMetricsServer();
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  });

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down server...`);

  if (metricsServer) {
    await new Promise((resolve) => metricsServer.close(resolve));
  }

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  await natsTransport.close();
  process.exit(0);
}

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.once(signal, () => {
    shutdown(signal).catch((error) => {
      logger.error({ error }, 'Server shutdown failed');
      process.exit(1);
    });
  });
});
