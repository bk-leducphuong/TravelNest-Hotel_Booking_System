/**
 * Health Check Routes
 * Provides endpoints for monitoring application health
 */

const express = require('express');
const router = express.Router();
const healthController = require('./health.controller');

router.get('/', healthController.getHealth);

router.get('/live', healthController.getLiveness);

router.get('/ready', healthController.getReadiness);

module.exports = router;
