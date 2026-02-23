const redis = require('redis');
const logger = require('@config/logger.config');

require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    username: process.env.REDIS_USERNAME || 'redis',
    password: process.env.REDIS_PASSWORD || '',
    database: process.env.REDIS_DATABASE || 1,
  },
});

// Connect to Redis
redisClient
  .connect()
  .then(() => logger.info('Redis connection successful'))
  .catch((err) => logger.error(err, 'Redis connection error'));

module.exports = redisClient;
