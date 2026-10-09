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
 *     description: |
 *       Returns the current authenticated principal if a valid Keycloak bearer token is
 *       supplied. Authentication is optional (`optionalAuthenticate`): without a token (or
 *       with an invalid one) the endpoint still responds 200 with `isAuthenticated: false`
 *       and a null user.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Current authentication state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       type: object
 *                       properties:
 *                         id: { type: string, nullable: true }
 *                         user:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id: { type: string, format: uuid }
 *                             type: { type: string }
 *                             email: { type: string, format: email }
 *                             roles:
 *                               type: array
 *                               items: { type: string }
 *                         context:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             hotelId: { type: string, format: uuid }
 *                             role: { type: string, nullable: true }
 *                         authProvider: { type: string }
 *                     isAuthenticated: { type: boolean }
 */
