const express = require('express');

const { checkAuth } = require('@controllers/v1/auth.controller');
const { optionalAuthenticate } = require('@middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /auth/session:
 *   get:
 *     summary: Inspect the current bearer-token principal
 *     description: Returns the current authenticated principal if a valid Keycloak bearer token is supplied.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current authentication state
 */
router.get('/session', optionalAuthenticate, checkAuth);

module.exports = router;
