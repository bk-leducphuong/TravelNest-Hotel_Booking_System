/**
 * OpenAPI documentation extracted from the identity auth routes.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 */

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
