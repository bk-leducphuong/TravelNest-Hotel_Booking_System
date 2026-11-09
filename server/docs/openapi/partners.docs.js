/**
 * OpenAPI documentation for the outbound partner affiliate links.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 */

/**
 * @swagger
 * tags:
 *   - name: Partners
 *     description: Outbound affiliate deep links (flights, airport transfers)
 */

/**
 * @swagger
 * /partners/links:
 *   get:
 *     tags: [Partners]
 *     summary: Build an affiliate deep link for a partner service
 *     description: |
 *       Builds the outbound URL server-side so the affiliate id and the
 *       partner URL template never reach the browser bundle. Placeholders the
 *       caller leaves blank (for example `returnDate` for a one-way flight)
 *       are omitted from the URL.
 *     parameters:
 *       - in: query
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *           enum: [flights, transfers]
 *       - in: query
 *         name: origin
 *         description: Flight origin (airport code or city)
 *         schema:
 *           type: string
 *       - in: query
 *         name: destination
 *         description: Flight destination (airport code or city)
 *         schema:
 *           type: string
 *       - in: query
 *         name: departDate
 *         description: Flight departure date
 *         schema:
 *           type: string
 *           example: '2026-12-01'
 *       - in: query
 *         name: returnDate
 *         description: Optional return date
 *         schema:
 *           type: string
 *           example: '2026-12-08'
 *       - in: query
 *         name: adults
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 9
 *       - in: query
 *         name: children
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 9
 *       - in: query
 *         name: cabinClass
 *         schema:
 *           type: string
 *           enum: [economy, premium_economy, business, first]
 *       - in: query
 *         name: pickup
 *         description: Transfer pick-up location
 *         schema:
 *           type: string
 *       - in: query
 *         name: dropoff
 *         description: Transfer drop-off location
 *         schema:
 *           type: string
 *       - in: query
 *         name: pickupDate
 *         schema:
 *           type: string
 *           example: '2026-12-01'
 *       - in: query
 *         name: pickupTime
 *         schema:
 *           type: string
 *           example: '09:30'
 *       - in: query
 *         name: passengers
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 9
 *       - in: query
 *         name: luggage
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 9
 *     responses:
 *       200:
 *         description: The outbound affiliate link
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
 *                     service:
 *                       type: string
 *                       example: flights
 *                     provider:
 *                       type: string
 *                       nullable: true
 *                       example: Example Air
 *                     url:
 *                       type: string
 *                       format: uri
 *       400:
 *         description: Invalid search parameters or unknown service
 *       503:
 *         description: Partner is not configured (PARTNER_NOT_CONFIGURED)
 */
