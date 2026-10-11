/**
 * OpenAPI documentation extracted from bff/admin/me.routes.js.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 *
 * The router is mounted at /api/v1/admin/me and requires `authenticate`.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminMeHotel:
 *       type: object
 *       description: A hotel the authenticated user can manage, used to populate the admin hotel switcher.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Hotel UUID.
 *         name:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           nullable: true
 *           description: The user's role name within this hotel.
 *         isPrimaryOwner:
 *           type: boolean
 *         permissions:
 *           type: array
 *           description: Permission names granted by the hotel role, sorted.
 *           items:
 *             type: string
 *     AdminMe:
 *       type: object
 *       description: Session payload the admin client uses to gate navigation/actions and populate the hotel switcher.
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             email:
 *               type: string
 *               format: email
 *         globalRoles:
 *           type: array
 *           description: Names of the user's global roles.
 *           items:
 *             type: string
 *         tokenRoles:
 *           type: array
 *           description: Role names carried by the access token.
 *           items:
 *             type: string
 *         permissions:
 *           type: array
 *           description: Union of global and per-hotel permissions, sorted.
 *           items:
 *             type: string
 *         hotels:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AdminMeHotel'
 *
 */

/**
 * @swagger
 * /admin/me:
 *   get:
 *     summary: Get the current admin session
 *     description: |
 *       Returns the authenticated user's identity, global roles, effective permissions
 *       (union of global and per-hotel permissions) and the hotels they can manage.
 *       Consumed by the admin client to gate navigation/actions.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin session payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/AdminMe'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */
