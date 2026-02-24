const sequelize = require('@config/database.config');
const redisClient = require('@config/redis.config');
const { minioClient, bucketName } = require('@config/minio.config');
const elasticsearchClient = require('@config/elasticsearch.config');
const clickhouseClient = require('@config/clickhouse.config');
const logger = require('@config/logger.config');

/**
 * Health Check Service
 * Provides comprehensive health status for all application dependencies
 */
class HealthService {
  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive health status
   * @returns {Promise<Object>} Health status object
   */
  async getHealthStatus() {
    const checks = await Promise.allSettled([
      this.checkNodeProcess(),
      this.checkMySQLConnection(),
      this.checkRedisConnection(),
      this.checkMinIOConnection(),
      this.checkElasticsearchConnection(),
      this.checkClickHouseConnection(),
    ]);

    const [nodeCheck, mysqlCheck, redisCheck, minioCheck, elasticsearchCheck, clickhouseCheck] =
      checks;

    const services = {
      node: this._formatCheckResult(nodeCheck),
      mysql: this._formatCheckResult(mysqlCheck),
      redis: this._formatCheckResult(redisCheck),
      minio: this._formatCheckResult(minioCheck),
      elasticsearch: this._formatCheckResult(elasticsearchCheck),
      clickhouse: this._formatCheckResult(clickhouseCheck),
    };

    // Determine overall status
    const allHealthy = Object.values(services).every((service) => service.status === 'healthy');
    const anyUnhealthy = Object.values(services).some((service) => service.status === 'unhealthy');

    let overallStatus = 'healthy';
    if (anyUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (!allHealthy) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      services,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Check Node.js process health
   * @returns {Promise<Object>}
   */
  async checkNodeProcess() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        status: 'healthy',
        message: 'Node.js process is running',
        details: {
          pid: process.pid,
          uptime: this.getUptime(),
          memory: {
            rss: this._formatBytes(memoryUsage.rss),
            heapTotal: this._formatBytes(memoryUsage.heapTotal),
            heapUsed: this._formatBytes(memoryUsage.heapUsed),
            external: this._formatBytes(memoryUsage.external),
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

  /**
   * Check MySQL connection health
   * @returns {Promise<Object>}
   */
  async checkMySQLConnection() {
    const startTime = Date.now();
    try {
      await sequelize.authenticate();

      // Get additional connection info
      const [results] = await sequelize.query('SELECT VERSION() as version');
      const version = results[0]?.version;

      // Get connection pool status
      const pool = sequelize.connectionManager.pool;
      const poolStats = {
        size: pool.size,
        available: pool.available,
        using: pool.using,
        waiting: pool.waiting,
      };

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'MySQL connection is active',
        details: {
          host: process.env.DB_HOST,
          database: process.env.DB_NAME,
          version,
          pool: poolStats,
        },
        responseTime,
      };
    } catch (error) {
      logger.error('MySQL health check failed:', error);
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        message: 'MySQL connection failed',
        error: error.message,
        responseTime,
      };
    }
  }

  /**
   * Check Redis connection health
   * @returns {Promise<Object>}
   */
  async checkRedisConnection() {
    const startTime = Date.now();
    try {
      // Check if client is ready
      if (!redisClient.isReady) {
        throw new Error('Redis client is not ready');
      }

      // Ping Redis
      const pingResponse = await redisClient.ping();

      // Get Redis info
      const info = await redisClient.info('server');
      const versionMatch = info.match(/redis_version:([^\r\n]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      // Get memory info
      const memoryInfo = await redisClient.info('memory');
      const usedMemoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
      const usedMemory = usedMemoryMatch ? usedMemoryMatch[1] : 'unknown';

      const responseTime = Date.now() - startTime;

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
        responseTime,
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        message: 'Redis connection failed',
        error: error.message,
        responseTime,
      };
    }
  }

  /**
   * Check MinIO connection health
   * @returns {Promise<Object>}
   */
  async checkMinIOConnection() {
    const startTime = Date.now();
    try {
      // Check if the configured bucket exists
      const bucketExists = await minioClient.bucketExists(bucketName);

      if (!bucketExists) {
        throw new Error(`Bucket "${bucketName}" does not exist`);
      }

      // List objects to verify read access (limit to 1 object)
      await new Promise((resolve, reject) => {
        const stream = minioClient.listObjects(bucketName, '', false);
        let hasData = false;

        stream.on('data', () => {
          hasData = true;
          stream.destroy(); // Stop after first object
          resolve();
        });

        stream.on('end', () => {
          // Even if bucket is empty, reaching end means connection works
          resolve();
        });

        stream.on('error', (err) => {
          reject(err);
        });
      });

      const responseTime = Date.now() - startTime;

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
        responseTime,
      };
    } catch (error) {
      logger.error('MinIO health check failed:', error);
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        message: 'MinIO connection failed',
        error: error.message,
        responseTime,
      };
    }
  }

  /**
   * Check Elasticsearch connection health
   * @returns {Promise<Object>}
   */
  async checkElasticsearchConnection() {
    const startTime = Date.now();
    try {
      // Ping Elasticsearch to check basic connectivity
      const pingResponse = await elasticsearchClient.ping();

      if (!pingResponse) {
        throw new Error('Elasticsearch ping failed');
      }

      // Get cluster health
      const health = await elasticsearchClient.cluster.health();

      // Get cluster info
      const info = await elasticsearchClient.info();

      const responseTime = Date.now() - startTime;

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
        responseTime,
      };
    } catch (error) {
      logger.error('Elasticsearch health check failed:', error);
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        message: 'Elasticsearch connection failed',
        error: error.message,
        responseTime,
      };
    }
  }

  /**
   * Check ClickHouse connection health
   * @returns {Promise<Object>}
   */
  async checkClickHouseConnection() {
    const startTime = Date.now();
    try {
      const isHealthy = await clickhouseClient.ping();

      if (!isHealthy) {
        throw new Error('ClickHouse ping failed');
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'ClickHouse connection is active',
        details: {
          host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
          database: process.env.CLICKHOUSE_DATABASE || 'travelnest',
        },
        responseTime,
      };
    } catch (error) {
      logger.error('ClickHouse health check failed:', error);
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        message: 'ClickHouse connection failed',
        error: error.message,
        responseTime,
      };
    }
  }

  /**
   * Get application uptime in human-readable format
   * @returns {Object}
   */
  getUptime() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
      seconds: uptimeSeconds,
      formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
    };
  }

  /**
   * Format check result from Promise.allSettled
   * @private
   */
  _formatCheckResult(result) {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        message: 'Health check failed',
        error: result.reason?.message || 'Unknown error',
      };
    }
  }

  /**
   * Format bytes to human-readable format
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get basic liveness probe (simple check if server is running)
   * @returns {Object}
   */
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get readiness probe (check if server is ready to accept traffic)
   * @returns {Promise<Object>}
   */
  async getReadiness() {
    try {
      // Check critical dependencies
      const [mysqlCheck, redisCheck] = await Promise.allSettled([
        this.checkMySQLConnection(),
        this.checkRedisConnection(),
      ]);

      const mysqlHealthy =
        mysqlCheck.status === 'fulfilled' && mysqlCheck.value.status === 'healthy';
      const redisHealthy =
        redisCheck.status === 'fulfilled' && redisCheck.value.status === 'healthy';

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
}

// Export singleton instance
const healthService = new HealthService();
module.exports = healthService;
