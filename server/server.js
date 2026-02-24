require('dotenv').config({
  path: process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production',
});
const logger = require('./config/logger.config');
const createApp = require('./app');
const PORT = process.env.PORT || 3000;

createApp()
  .then((app) => {
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });
