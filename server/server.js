require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});
const logger = require('./config/logger.config');
const createApp = require('./app');
const PORT = process.env.PORT || 3000;

createApp()
  .then((server) => {
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  });
