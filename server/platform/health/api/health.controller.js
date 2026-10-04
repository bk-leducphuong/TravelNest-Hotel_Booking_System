const health = {
  getHealthStatus: require('../application/getHealthStatus').getHealthStatus,
  getLiveness: require('../application/getLiveness').getLiveness,
  getReadiness: require('../application/getReadiness').getReadiness,
};
const logger = require('@config/logger.config');

/**
 * Health Check Controller
 * Handles HTTP requests for health check endpoints
 */
class HealthController {
  /**
   * Get comprehensive health status
   * @route GET /health
   */
  async getHealth(req, res, next) {
    try {
      const healthStatus = await health.getHealthStatus();

      // Set appropriate HTTP status code based on health
      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: healthStatus.status === 'healthy',
        data: healthStatus,
      });
    } catch (error) {
      logger.error('Health check endpoint error:', error);
      next(error);
    }
  }

  /**
   * Get liveness probe
   * @route GET /health/live
   * @description Simple check to verify the server process is running
   */
  async getLiveness(req, res, next) {
    try {
      const liveness = health.getLiveness();
      res.status(200).json({
        success: true,
        data: liveness,
      });
    } catch (error) {
      logger.error('Liveness check endpoint error:', error);
      next(error);
    }
  }

  /**
   * Get readiness probe
   * @route GET /health/ready
   * @description Check if server is ready to accept traffic (critical dependencies are healthy)
   */
  async getReadiness(req, res, next) {
    try {
      const readiness = await health.getReadiness();

      // Set appropriate HTTP status code based on readiness
      const statusCode = readiness.status === 'ready' ? 200 : 503;

      res.status(statusCode).json({
        success: readiness.status === 'ready',
        data: readiness,
      });
    } catch (error) {
      logger.error('Readiness check endpoint error:', error);
      next(error);
    }
  }
}

module.exports = new HealthController();
