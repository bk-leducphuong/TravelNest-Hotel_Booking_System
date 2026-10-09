/**
 * OpenAPI documentation extracted from modules/identity/api/user.routes.js.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 *
 * The router is mounted at /api/v1/user and every route requires `authenticate`.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       description: Current authenticated user. Field set comes from the repository projection.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         full_name:
 *           type: string
 *           description: Virtual field composed as `first_name last_name`.
 *         username:
 *           type: string
 *           description: Alias of `full_name`.
 *         profile_picture_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         phone_number:
 *           type: string
 *           nullable: true
 *           description: E.164 formatted phone number.
 *         address:
 *           type: string
 *           nullable: true
 *         nationality:
 *           type: string
 *           nullable: true
 *         country:
 *           type: string
 *           nullable: true
 *         date_of_birth:
 *           type: string
 *           format: date
 *           nullable: true
 *         gender:
 *           type: string
 *           nullable: true
 *           enum: [male, female, non_binary, other, prefer_not_to_say]
 *         user_role:
 *           type: string
 *           nullable: true
 *           description: Name of the user's first global role, or null when the user has none.
 *         roles:
 *           type: array
 *           description: Names of the user's global roles.
 *           items:
 *             type: string
 *     FavoriteHotel:
 *       type: object
 *       description: A saved (favorite) hotel entry, with the joined hotel information.
 *       properties:
 *         hotel_id:
 *           type: string
 *           format: uuid
 *         hotelInformation:
 *           type: object
 *           nullable: true
 *           description: Joined hotel summary; null when the referenced hotel no longer exists.
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             address:
 *               type: string
 *               nullable: true
 *             hotel_class:
 *               type: integer
 *               nullable: true
 *               description: Star rating (1-5).
 *             check_in_time:
 *               type: string
 *               nullable: true
 *             check_out_time:
 *               type: string
 *               nullable: true
 *             min_price:
 *               type: number
 *               format: double
 *               nullable: true
 *             overall_rating:
 *               type: number
 *               format: double
 *               description: Overall rating, or 0 when no summary exists.
 *             image_urls:
 *               type: array
 *               description: Active image object keys, primary image first.
 *               items:
 *                 type: string
 *     FavoriteHotelListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FavoriteHotel'
 *         meta:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 20
 *             total:
 *               type: integer
 *               example: 42
 *
 */

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Get the current user
 *     description: Returns the profile of the authenticated user.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
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
 *       404:
 *         description: User not found (USER_NOT_FOUND)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /user:
 *   patch:
 *     summary: Update the current user
 *     description: |
 *       Partial update of the authenticated user's profile. At least one field must be
 *       supplied. When `name` is provided it is split into `first_name` and the remainder
 *       stored as `last_name`. `displayName` is validated but not persisted.
 *
 *       Unknown fields are stripped by the validation middleware; if no known field
 *       remains the request fails with 400 VALIDATION_ERROR.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Full name; split on whitespace into first/last name.
 *               displayName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *                 pattern: '^\+?[1-9]\d{1,14}$'
 *                 description: International format, e.g. +1234567890.
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: ISO 8601 date; must not be in the future.
 *               address:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *               nationality:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               country:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               gender:
 *                 type: string
 *                 enum: [male, female, other, prefer_not_to_say]
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                       example: User updated successfully
 *       400:
 *         description: Validation error (VALIDATION_ERROR). `fields` maps field path to message.
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
 *       404:
 *         description: User not found (USER_NOT_FOUND)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already in use (EMAIL_ALREADY_IN_USE)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /user/password:
 *   patch:
 *     summary: Update the current user's password (removed)
 *     description: |
 *       This endpoint is no longer supported. The controller always responds with
 *       410 Gone (`PASSWORD_FLOW_REMOVED`); password changes are handled through
 *       Keycloak account management. The request body is still validated first, so an
 *       invalid body yields 400 VALIDATION_ERROR before the 410.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *               confirmNewPassword:
 *                 type: string
 *                 description: Must equal `newPassword`.
 *     responses:
 *       400:
 *         description: Validation error (VALIDATION_ERROR). `fields` maps field path to message.
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
 *       410:
 *         description: Password flow removed (PASSWORD_FLOW_REMOVED)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: PASSWORD_FLOW_REMOVED
 *                     message:
 *                       type: string
 *                       example: Password changes are now managed through Keycloak account management.
 */

/**
 * @swagger
 * /user/avatar:
 *   patch:
 *     summary: Update the current user's avatar
 *     description: |
 *       Uploads a new avatar image for the authenticated user via multipart form-data.
 *       Only image MIME types are accepted and the file must be at most 5 MB. No extra
 *       form fields are allowed (unknown fields are rejected).
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (image/* only, max 5 MB).
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     profilePictureUrl:
 *                       type: string
 *                       format: uri
 *                     message:
 *                       type: string
 *                       example: Avatar updated successfully
 *       400:
 *         description: |
 *           No file uploaded (BAD_REQUEST, `fields.avatar = "File is required"`), or the
 *           file was rejected by multer (not an image / exceeds 5 MB).
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
 *       500:
 *         description: Avatar upload failed (INTERNAL_ERROR when the upstream Cloudinary upload fails, otherwise UPLOAD_FAILED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Media service unavailable (MEDIA_SERVICE_UNAVAILABLE)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /user/favorite-hotels:
 *   get:
 *     summary: List the current user's favorite hotels
 *     description: Returns a paginated list of the authenticated user's saved hotels with joined hotel information.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page.
 *     responses:
 *       200:
 *         description: Paginated list of favorite hotels
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FavoriteHotelListResponse'
 *       400:
 *         description: Validation error (VALIDATION_ERROR). `fields` maps field path to message.
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
 *
 *   post:
 *     summary: Add a hotel to favorites
 *     description: Saves the given hotel to the authenticated user's favorites.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotelId
 *             properties:
 *               hotelId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Hotel added to favorites
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
 *                       example: Hotel added to favorites
 *       400:
 *         description: Validation error (VALIDATION_ERROR). `fields` maps field path to message.
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
 *       404:
 *         description: Hotel not found (HOTEL_NOT_FOUND)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Hotel already in favorites (HOTEL_ALREADY_FAVORITE)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /user/favorite-hotels/{hotelId}:
 *   get:
 *     summary: Check whether a hotel is a favorite
 *     description: Returns whether the given hotel is saved in the authenticated user's favorites.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID.
 *     responses:
 *       200:
 *         description: Favorite status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     isFavorite:
 *                       type: boolean
 *       400:
 *         description: Validation error (VALIDATION_ERROR). `fields` maps field path to message.
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
 *
 *   delete:
 *     summary: Remove a hotel from favorites
 *     description: Removes the given hotel from the authenticated user's favorites. Idempotent (204 even if it was not saved).
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID.
 *     responses:
 *       204:
 *         description: Favorite removed (no response body)
 *       400:
 *         description: Validation error (VALIDATION_ERROR). `fields` maps field path to message.
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
