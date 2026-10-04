const logger = require('@config/logger.config');

const { checkMySQLConnection, checkRedisConnection } = require('../checks');

/**
 * Readiness probe: the critical dependencies (MySQL, Redis) are healthy.
 */
async function getReadiness() {
  try {
    const [mysqlCheck, redisCheck] = await Promise.allSettled([
      checkMySQLConnection(),
      checkRedisConnection(),
    ]);

    const mysqlHealthy = mysqlCheck.status === 'fulfilled' && mysqlCheck.value.status === 'healthy';
    const redisHealthy = redisCheck.status === 'fulfilled' && redisCheck.value.status === 'healthy';

    const ready = mysqlHealthy && redisHealthy;

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        mysql: mysqlHealthy,
        redis: redisHealthy,
      },
    };
  } catch (error) {
    logger.error('Readiness check failed:', error);
    return {
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
}

module.exports = { getReadiness };
