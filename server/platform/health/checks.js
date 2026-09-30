const sequelize = require('@config/database.config');
const redisClient = require('@config/redis.config');
const { minioClient, bucketName } = require('@config/minio.config');
const elasticsearchClient = require('@config/elasticsearch.config');
const logger = require('@config/logger.config');
const analyticsService = require('@services/analytics.service');

const { formatBytes } = require('./format');
const { getUptime } = require('./uptime');

/**
 * Individual dependency probes. Each returns `{ status, message, details?,
 * responseTime? }` and never throws — failures are reported as `unhealthy`.
 */

async function checkNodeProcess() {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      status: 'healthy',
      message: 'Node.js process is running',
      details: {
        pid: process.pid,
        uptime: getUptime(),
        memory: {
          rss: formatBytes(memoryUsage.rss),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          external: formatBytes(memoryUsage.external),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      responseTime: 0,
    };
  } catch (error) {
    logger.error('Node process health check failed:', error);
    return {
      status: 'unhealthy',
      message: error.message,
      error: error.message,
    };
  }
}

async function checkMySQLConnection() {
  const startTime = Date.now();
  try {
    await sequelize.authenticate();

    const [results] = await sequelize.query('SELECT VERSION() as version');
    const version = results[0]?.version;

    const pool = sequelize.connectionManager.pool;
    const poolStats = {
      size: pool.size,
      available: pool.available,
      using: pool.using,
      waiting: pool.waiting,
    };

    return {
      status: 'healthy',
      message: 'MySQL connection is active',
      details: {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        version,
        pool: poolStats,
      },
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('MySQL health check failed:', error);
    return {
      status: 'unhealthy',
      message: 'MySQL connection failed',
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkRedisConnection() {
  const startTime = Date.now();
  try {
    if (!redisClient.isReady) {
      throw new Error('Redis client is not ready');
    }

    const pingResponse = await redisClient.ping();

    const info = await redisClient.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    const memoryInfo = await redisClient.info('memory');
    const usedMemoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
    const usedMemory = usedMemoryMatch ? usedMemoryMatch[1] : 'unknown';

    return {
      status: 'healthy',
      message: 'Redis connection is active',
      details: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        version,
        usedMemory,
        ping: pingResponse,
      },
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'unhealthy',
      message: 'Redis connection failed',
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkMinIOConnection() {
  const startTime = Date.now();
  try {
    const bucketExists = await minioClient.bucketExists(bucketName);

    if (!bucketExists) {
      throw new Error(`Bucket "${bucketName}" does not exist`);
    }

    // Reaching 'data' or 'end' means the stream works; stop after the first object.
    await new Promise((resolve, reject) => {
      const stream = minioClient.listObjects(bucketName, '', false);

      stream.on('data', () => {
        stream.destroy();
        resolve();
      });

      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
    });

    return {
      status: 'healthy',
      message: 'MinIO connection is active',
      details: {
        endpoint: process.env.MINIO_ENDPOINT,
        port: process.env.MINIO_PORT,
        bucket: bucketName,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        bucketExists: true,
      },
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('MinIO health check failed:', error);
    return {
      status: 'unhealthy',
      message: 'MinIO connection failed',
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkElasticsearchConnection() {
  const startTime = Date.now();
  try {
    const pingResponse = await elasticsearchClient.ping();

    if (!pingResponse) {
      throw new Error('Elasticsearch ping failed');
    }

    const health = await elasticsearchClient.cluster.health();
    const info = await elasticsearchClient.info();

    return {
      status: 'healthy',
      message: 'Elasticsearch connection is active',
      details: {
        host: process.env.ELASTICSEARCH_HOSTS,
        clusterName: health.cluster_name,
        clusterStatus: health.status,
        numberOfNodes: health.number_of_nodes,
        numberOfDataNodes: health.number_of_data_nodes,
        activeShards: health.active_shards,
        version: info.version.number,
      },
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Elasticsearch health check failed:', error);
    return {
      status: 'unhealthy',
      message: 'Elasticsearch connection failed',
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkAnalyticsService() {
  const startTime = Date.now();
  try {
    const result = await analyticsService.healthz();

    if (result?.status !== 'ok') {
      throw new Error('Analytics service health check failed');
    }

    return {
      status: 'healthy',
      message: 'Analytics service is healthy',
      details: {
        url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8081',
      },
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Analytics service health check failed:', error);
    return {
      status: 'unhealthy',
      message: 'Analytics service connection failed',
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

module.exports = {
  checkNodeProcess,
  checkMySQLConnection,
  checkRedisConnection,
  checkMinIOConnection,
  checkElasticsearchConnection,
  checkAnalyticsService,
};
