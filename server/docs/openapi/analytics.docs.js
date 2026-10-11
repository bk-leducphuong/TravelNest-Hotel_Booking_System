/**
 * OpenAPI documentation extracted from modules/analytics/api/analytics.routes.js.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 *
 * These endpoints proxy the analytics service through
 * modules/analytics/infrastructure/analytics-service.client.js. When the upstream
 * service is unreachable the client throws ApiError(502, 'ANALYTICS_SERVICE_UNAVAILABLE').
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AnalyticsSearchDemand:
 *       type: object
 *       description: Aggregated search demand for a check-in date and destination.
 *       properties:
 *         checkInDate:
 *           type: string
 *           format: date
 *           description: Check-in date bucket (YYYY-MM-DD)
 *           example: "2026-03-15"
 *         destinationId:
 *           type: string
 *           description: Destination identifier
 *         destinationType:
 *           type: string
 *           description: Destination type (e.g. city, country)
 *         searchCount:
 *           type: integer
 *           description: Number of searches in this date/destination bucket
 *         avgNights:
 *           type: number
 *           format: float
 *           description: Average nights across matching searches
 *         avgGuests:
 *           type: number
 *           format: float
 *           description: Average total guests (adults + children)
 *     AnalyticsUserSearchSummary:
 *       type: object
 *       description: Aggregate of the authenticated user's searches.
 *       properties:
 *         userId:
 *           type: string
 *         totalSearches:
 *           type: integer
 *         locationsVisited:
 *           type: array
 *           items:
 *             type: string
 *         uniqueLocations:
 *           type: integer
 *         lastSearchTime:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Omitted when the user has no searches
 *         firstSearchTime:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Omitted when the user has no searches
 *     AnalyticsUserSearch:
 *       type: object
 *       properties:
 *         searchId:
 *           type: string
 *         checkInDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         checkOutDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         adults:
 *           type: integer
 *         children:
 *           type: integer
 *         rooms:
 *           type: integer
 *         searchTime:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /analytics/search/demand:
 *   get:
 *     summary: Get upcoming search demand
 *     description: |
 *       Returns aggregated search demand for upcoming check-in dates, proxied from the
 *       analytics service. Results are grouped by check-in date and destination and sorted
 *       by search count. This endpoint is public (no authentication required).
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: nextDays
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 90
 *         description: Number of days ahead to include
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *         description: Maximum number of demand buckets to return
 *     responses:
 *       200:
 *         description: Search demand buckets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     demand:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AnalyticsSearchDemand'
 *       400:
 *         description: "Validation error. Body is `{ error: { code: VALIDATION_ERROR, message, fields } }`."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Analytics service is unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /analytics/users/me/search-summary:
 *   get:
 *     summary: Get the current user's search summary
 *     description: |
 *       Returns an aggregate summary of the authenticated user's searches (total searches,
 *       locations visited, first/last search times), proxied from the analytics service.
 *       When the user has no searches, the summary contains `totalSearches: 0`,
 *       `locationsVisited: []` and `uniqueLocations: 0`.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User search summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       $ref: '#/components/schemas/AnalyticsUserSearchSummary'
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
 *       502:
 *         description: Analytics service is unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /analytics/users/me/searches:
 *   get:
 *     summary: Get the current user's recent searches
 *     description: |
 *       Returns the authenticated user's most recent searches, newest first, proxied from
 *       the analytics service.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of searches to return
 *     responses:
 *       200:
 *         description: Recent searches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     searches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AnalyticsUserSearch'
 *       400:
 *         description: "Validation error. Body is `{ error: { code: VALIDATION_ERROR, message, fields } }`."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *       502:
 *         description: Analytics service is unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
