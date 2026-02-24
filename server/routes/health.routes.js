/**
 * Health Check Routes
 * Provides endpoints for monitoring application health
 */

const express = require('express');
const router = express.Router();
const healthController = require('@controllers/v1/health.controller');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get comprehensive health status
 *     description: Returns detailed health status of all services including Node.js process, MySQL, Redis, and RabbitMQ
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All services are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: object
 *                     services:
 *                       type: object
 *                     version:
 *                       type: string
 *                     environment:
 *                       type: string
 *       503:
 *         description: One or more services are unhealthy
 */
router.get('/', healthController.getHealth);

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Simple check to verify the server process is running (for Kubernetes liveness probe)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/live', healthController.getLiveness);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Check if server is ready to accept traffic - verifies critical dependencies (MySQL, Redis) are healthy
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is ready to accept traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [ready, not_ready]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     checks:
 *                       type: object
 *       503:
 *         description: Server is not ready (dependencies are unhealthy)
 */
router.get('/ready', healthController.getReadiness);

module.exports = router;

