const checks = require('../checks');
const { formatCheckResult } = require('../format');
const { getUptime } = require('../uptime');

/**
 * Comprehensive health status across all dependencies.
 *
 * Overall status: `unhealthy` if any dependency is unhealthy, else `degraded`
 * if any is not healthy, else `healthy`.
 */
async function getHealthStatus() {
  const settled = await Promise.allSettled([
    checks.checkNodeProcess(),
    checks.checkMySQLConnection(),
    checks.checkRedisConnection(),
    checks.checkMinIOConnection(),
    checks.checkElasticsearchConnection(),
    checks.checkAnalyticsService(),
  ]);

  const [nodeCheck, mysqlCheck, redisCheck, minioCheck, elasticsearchCheck, analyticsCheck] =
    settled;

  const services = {
    node: formatCheckResult(nodeCheck),
    mysql: formatCheckResult(mysqlCheck),
    redis: formatCheckResult(redisCheck),
    minio: formatCheckResult(minioCheck),
    elasticsearch: formatCheckResult(elasticsearchCheck),
    analytics: formatCheckResult(analyticsCheck),
  };

  const allHealthy = Object.values(services).every((service) => service.status === 'healthy');
  const anyUnhealthy = Object.values(services).some((service) => service.status === 'unhealthy');

  let status = 'healthy';
  if (anyUnhealthy) {
    status = 'unhealthy';
  } else if (!allHealthy) {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: getUptime(),
    services,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };
}

module.exports = { getHealthStatus };
