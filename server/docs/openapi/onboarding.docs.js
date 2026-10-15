/**
 * OpenAPI documentation extracted from modules/onboarding/api/join.routes.js.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 *
 * Both routes are mounted under /api/v1/join and require authentication
 * (the router applies `authenticate` to every route).
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     JoinCoordinates:
 *       type: object
 *       required:
 *         - latitude
 *         - longitude
 *       properties:
 *         latitude:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         longitude:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *     JoinRoomDetails:
 *       type: object
 *       required:
 *         - roomType
 *         - numberOfGuests
 *         - numberOfRooms
 *       properties:
 *         roomType:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         numberOfGuests:
 *           type: integer
 *           minimum: 1
 *           description: Positive integer
 *         numberOfRooms:
 *           type: integer
 *           minimum: 1
 *           description: Positive integer
 *     JoinFormData:
 *       type: object
 *       description: Partner registration (join) form payload.
 *       required:
 *         - hotelName
 *         - streetName
 *         - city
 *         - coordinates
 *         - checkInFrom
 *         - checkInTo
 *         - checkOutFrom
 *         - checkOutTo
 *         - roomDetails
 *       properties:
 *         hotelName:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         streetName:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *         city:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         coordinates:
 *           $ref: '#/components/schemas/JoinCoordinates'
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           nullable: true
 *           description: Optional star rating; stored as the hotel's hotel_class.
 *         checkInFrom:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Check-in window start in 24-hour HH:MM format
 *         checkInTo:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Check-in window end in 24-hour HH:MM format; must be after checkInFrom
 *         checkOutFrom:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Check-out window start in 24-hour HH:MM format
 *         checkOutTo:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Check-out window end in 24-hour HH:MM format; must be after checkOutFrom
 *         roomDetails:
 *           $ref: '#/components/schemas/JoinRoomDetails'
 */

/**
 * @swagger
 * /join:
 *   post:
 *     summary: Submit partner join form
 *     description: |
 *       Creates or updates the authenticated user's hotel, creates the first room, and
 *       initializes 60 days of room inventory. Requires authentication.
 *
 *       The body may be sent in either of two equivalent shapes:
 *       - **Nested**: `{ "joinFormData": { ... } }` where `joinFormData` is a JoinFormData object.
 *       - **Flat**: the same JoinFormData fields at the root (`hotelName`, `streetName`,
 *         `city`, `coordinates`, `roomDetails`, and the remaining fields), kept for
 *         backward compatibility.
 *     tags:
 *       - Onboarding
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             description: Either the nested `joinFormData` object or the same fields at the root.
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - joinFormData
 *                 properties:
 *                   joinFormData:
 *                     $ref: '#/components/schemas/JoinFormData'
 *               - $ref: '#/components/schemas/JoinFormData'
 *     responses:
 *       201:
 *         description: Join form submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotel_id:
 *                       type: string
 *                       format: uuid
 *                       description: ID of the created or updated hotel
 *                     room_id:
 *                       type: string
 *                       format: uuid
 *                       description: ID of the created room
 *                     message:
 *                       type: string
 *                       example: Join form submitted successfully
 *       400:
 *         description: |
 *           Validation or business error. Body is `{ error: { code, message, fields } }`.
 *           Possible codes: `VALIDATION_ERROR` (with `fields`), `MISSING_REQUIRED_FIELDS`,
 *           `INVALID_LATITUDE`, `INVALID_LONGITUDE`, `INVALID_NUMBER_OF_ROOMS`,
 *           `INVALID_NUMBER_OF_GUESTS`.
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
 */

/**
 * @swagger
 * /join/photos:
 *   post:
 *     summary: Upload hotel and room photos for a join submission
 *     description: |
 *       Uploads and processes hotel/room photos through the media service. Accepts
 *       `multipart/form-data` with up to 30 image files (image/* MIME types, max 5MB each).
 *       Requires authentication.
 *     tags:
 *       - Onboarding
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - hotel_id
 *               - room_id
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 maxItems: 30
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files (image/* only, max 5MB each)
 *               hotel_id:
 *                 type: string
 *                 format: uuid
 *               room_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Photos uploaded and processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Photos uploaded and processed successfully
 *                     imageUrls:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: uri
 *                     count:
 *                       type: integer
 *                       description: Number of uploaded image URLs
 *       400:
 *         description: |
 *           Validation or upload error. Body is `{ error: { code, message, fields } }`.
 *           Possible codes: `VALIDATION_ERROR` (with `fields`), `MISSING_PARAMETERS`,
 *           `NO_FILES_UPLOADED`.
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
 *         description: Media service is unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
