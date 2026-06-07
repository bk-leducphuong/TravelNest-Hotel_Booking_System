require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});
const logger = require('./config/logger.config');
const createApp = require('./app');
const natsPublisher = require('./events/nats.publisher');
const PORT = process.env.PORT || 3000;

let httpServer;

createApp()
  .then((app) => {
    httpServer = app.get('httpServer');

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  });

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down server...`);

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  await natsPublisher.close();
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
