/**
 * OpenAPI documentation extracted from modules/catalog/api/admin.routes.js.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 *
 * The router is mounted at /api/v1/admin/hotels. Every route requires a bearer
 * token plus an explicit permission. All routes except `GET /admin/hotels`
 * require hotel context (`requirePermission(..., { requireHotelContext: true })`).
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminCatalogHotel:
 *       type: object
 *       description: Hotel row returned by the admin catalog (database column names).
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         address:
 *           type: string
 *           nullable: true
 *         city_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         country_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         phone_number:
 *           type: string
 *           nullable: true
 *         latitude:
 *           type: number
 *           format: double
 *         longitude:
 *           type: number
 *           format: double
 *         hotel_class:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           nullable: true
 *         check_in_time:
 *           type: string
 *           nullable: true
 *           example: "14:00:00"
 *         check_out_time:
 *           type: string
 *           nullable: true
 *           example: "12:00:00"
 *         check_in_policy:
 *           type: string
 *           nullable: true
 *         check_out_policy:
 *           type: string
 *           nullable: true
 *         min_price:
 *           type: number
 *           format: double
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [active, inactive, pending, suspended]
 *         timezone:
 *           type: string
 *           nullable: true
 *           example: "Asia/Singapore"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     AdminCatalogRoom:
 *       type: object
 *       description: Room row returned by the admin catalog.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         hotel_id:
 *           type: string
 *           format: uuid
 *         room_name:
 *           type: string
 *         room_type:
 *           type: string
 *           nullable: true
 *         quantity:
 *           type: integer
 *         max_guests:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *     AdminCatalogHotelPolicy:
 *       type: object
 *       description: Full hotel policy row returned by the admin catalog.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         hotel_id:
 *           type: string
 *           format: uuid
 *         policy_type:
 *           type: string
 *           enum: [cancellation, children, pets, payment, smoking, damage, age_restriction, internet, parking, breakfast, group_booking, additional_fees, other]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         is_active:
 *           type: boolean
 *         display_order:
 *           type: integer
 *         icon:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     AdminCatalogPolicySummary:
 *       type: object
 *       description: Active hotel policy embedded in the admin hotel detail response.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         policy_type:
 *           type: string
 *           enum: [cancellation, children, pets, payment, smoking, damage, age_restriction, internet, parking, breakfast, group_booking, additional_fees, other]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         display_order:
 *           type: integer
 *         icon:
 *           type: string
 *           nullable: true
 *     AdminCatalogHotelListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AdminCatalogHotel'
 *         meta:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *     AdminCatalogHotelDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             hotel:
 *               $ref: '#/components/schemas/AdminCatalogHotel'
 *             rooms:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdminCatalogRoom'
 *             policies:
 *               type: array
 *               description: Active policies only.
 *               items:
 *                 $ref: '#/components/schemas/AdminCatalogPolicySummary'
 *     AdminCatalogHotelResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             hotel:
 *               $ref: '#/components/schemas/AdminCatalogHotel'
 *     AdminCatalogRoomListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             rooms:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdminCatalogRoom'
 *     AdminCatalogRoomResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             room:
 *               $ref: '#/components/schemas/AdminCatalogRoom'
 *     AdminCatalogRoomDeleteResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             roomId:
 *               type: string
 *               format: uuid
 *             hotelId:
 *               type: string
 *               format: uuid
 *     AdminCatalogPolicyListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             policies:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdminCatalogHotelPolicy'
 *     AdminCatalogPolicyResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             policy:
 *               $ref: '#/components/schemas/AdminCatalogHotelPolicy'
 *     AdminCatalogPolicyDeleteResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             policyId:
 *               type: string
 *               format: uuid
 *             hotelId:
 *               type: string
 *               format: uuid
 */

/**
 * @swagger
 * /admin/hotels:
 *   get:
 *     summary: List hotels (admin)
 *     description: |
 *       Paginated hotel list for the back-office. Unlike the guest hotel search, this does
 *       not filter by `active` status, so drafts/suspended/inactive rows are visible.
 *
 *       Requires the `hotel.read` permission. No hotel context is required for this route
 *       (platform staff and global readers may list every hotel).
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 200
 *         description: Case-insensitive substring match on hotel name or address (empty string allowed).
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending, suspended]
 *         description: Filter by hotel status.
 *       - in: query
 *         name: cityId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by city UUID.
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of hotels
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogHotelListResponse'
 *       400:
 *         description: Validation error. Unknown query fields are rejected.
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
 *       403:
 *         description: Missing the `hotel.read` permission
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
 * /admin/hotels/{hotelId}:
 *   get:
 *     summary: Get a hotel with its rooms and active policies (admin)
 *     description: |
 *       Hotel detail for the property editor: the hotel row plus its rooms and active policies.
 *
 *       Requires the `hotel.read` permission and hotel context (a hotel member for this hotel,
 *       or platform staff acting on any hotel).
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *     responses:
 *       200:
 *         description: Hotel detail with rooms and active policies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogHotelDetailResponse'
 *       400:
 *         description: Validation error or missing hotel context
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
 *       403:
 *         description: Missing the `hotel.read` permission or no access to this hotel
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
 *         description: Hotel not found (`HOTEL_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/hotels/{hotelId}:
 *   patch:
 *     summary: Update a hotel (admin)
 *     description: |
 *       Update a hotel's editable fields. The change is audited. At least one editable
 *       field must be provided; unknown fields are rejected.
 *
 *       Requires the `hotel.update` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
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
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 nullable: true
 *               address:
 *                 type: string
 *                 maxLength: 255
 *               cityId:
 *                 type: string
 *                 format: uuid
 *               countryId:
 *                 type: string
 *                 format: uuid
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 50
 *                 nullable: true
 *               latitude:
 *                 type: number
 *                 format: double
 *                 minimum: -90
 *                 maximum: 90
 *               longitude:
 *                 type: number
 *                 format: double
 *                 minimum: -180
 *                 maximum: 180
 *               hotelClass:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               checkInTime:
 *                 type: string
 *                 maxLength: 50
 *               checkOutTime:
 *                 type: string
 *                 maxLength: 50
 *               checkInPolicy:
 *                 type: string
 *                 nullable: true
 *               checkOutPolicy:
 *                 type: string
 *                 nullable: true
 *               minPrice:
 *                 type: number
 *                 format: double
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending, suspended]
 *               timezone:
 *                 type: string
 *                 maxLength: 64
 *     responses:
 *       200:
 *         description: Hotel updated; returns the refreshed hotel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogHotelResponse'
 *       400:
 *         description: Validation error, no editable fields provided (`NO_HOTEL_CHANGES`), or missing hotel context
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
 *       403:
 *         description: Missing the `hotel.update` permission or no access to this hotel
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
 *         description: Hotel not found (`HOTEL_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/hotels/{hotelId}/rooms:
 *   get:
 *     summary: List a hotel's rooms (admin)
 *     description: |
 *       Rooms for a hotel, including inactive rooms, so the owner can see soft-deleted ones
 *       (the UI surfaces `status`).
 *
 *       Requires the `room.read` permission and hotel context.
 *     tags:
 *       - Admin
 *       - Rooms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *     responses:
 *       200:
 *         description: Hotel rooms
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogRoomListResponse'
 *       400:
 *         description: Validation error or missing hotel context
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
 *       403:
 *         description: Missing the `room.read` permission or no access to this hotel
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
 *         description: Hotel not found (`HOTEL_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a room for a hotel (admin)
 *     description: |
 *       Creates a room for a hotel. The change is audited. Unknown fields are rejected.
 *
 *       Requires the `room.create` permission and hotel context.
 *     tags:
 *       - Admin
 *       - Rooms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomName
 *             properties:
 *               roomName:
 *                 type: string
 *                 maxLength: 255
 *               roomType:
 *                 type: string
 *                 maxLength: 100
 *                 description: "Free-form room type, e.g. single, double, twin, suite, deluxe, family, studio."
 *               maxGuests:
 *                 type: integer
 *                 minimum: 1
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               roomSize:
 *                 type: number
 *                 format: double
 *                 minimum: 0
 *                 description: Room size in square meters.
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       201:
 *         description: Room created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogRoomResponse'
 *       400:
 *         description: Validation error or missing hotel context
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
 *       403:
 *         description: Missing the `room.create` permission or no access to this hotel
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
 *         description: Hotel not found (`HOTEL_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/hotels/{hotelId}/rooms/{roomId}:
 *   patch:
 *     summary: Update a room (admin)
 *     description: |
 *       Update a room's editable fields. The room must belong to the hotel in the path.
 *       The change is audited. At least one editable field must be provided; unknown
 *       fields are rejected.
 *
 *       Requires the `room.update` permission and hotel context.
 *     tags:
 *       - Admin
 *       - Rooms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               roomName:
 *                 type: string
 *                 maxLength: 255
 *               roomType:
 *                 type: string
 *                 maxLength: 100
 *               maxGuests:
 *                 type: integer
 *                 minimum: 1
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               roomSize:
 *                 type: number
 *                 format: double
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Room updated; returns the refreshed room
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogRoomResponse'
 *       400:
 *         description: Validation error, no editable fields provided (`NO_ROOM_CHANGES`), or missing hotel context
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
 *       403:
 *         description: Missing the `room.update` permission or no access to this hotel
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
 *         description: Room not found (`ROOM_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Soft-delete a room (admin)
 *     description: |
 *       Marks a room inactive. Rooms are referenced by inventory and booking rows, so they
 *       are never hard-deleted. The room must belong to the hotel in the path. Audited.
 *
 *       Requires the `room.delete` permission and hotel context.
 *     tags:
 *       - Admin
 *       - Rooms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room UUID
 *     responses:
 *       200:
 *         description: Room deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogRoomDeleteResponse'
 *       400:
 *         description: Validation error or missing hotel context
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
 *       403:
 *         description: Missing the `room.delete` permission or no access to this hotel
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
 *         description: Room not found (`ROOM_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/hotels/{hotelId}/policies:
 *   get:
 *     summary: List a hotel's policies (admin)
 *     description: |
 *       Hotel policies for the back-office. Unlike the guest endpoint this includes
 *       inactive rows.
 *
 *       Requires the `hotel.read` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *     responses:
 *       200:
 *         description: Hotel policies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogPolicyListResponse'
 *       400:
 *         description: Validation error or missing hotel context
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
 *       403:
 *         description: Missing the `hotel.read` permission or no access to this hotel
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
 *         description: Hotel not found (`HOTEL_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a hotel policy (admin)
 *     description: |
 *       Creates a hotel policy. The change is audited. Unknown fields are rejected.
 *
 *       Requires the `hotel.update` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - policyType
 *               - title
 *               - description
 *             properties:
 *               policyType:
 *                 type: string
 *                 enum: [cancellation, children, pets, payment, smoking, damage, age_restriction, internet, parking, breakfast, group_booking, additional_fees, other]
 *               title:
 *                 type: string
 *                 maxLength: 150
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *               icon:
 *                 type: string
 *                 maxLength: 50
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Policy created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogPolicyResponse'
 *       400:
 *         description: Validation error or missing hotel context
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
 *       403:
 *         description: Missing the `hotel.update` permission or no access to this hotel
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
 *         description: Hotel not found (`HOTEL_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/hotels/{hotelId}/policies/{policyId}:
 *   patch:
 *     summary: Update a hotel policy (admin)
 *     description: |
 *       Update a hotel policy. The policy must belong to the hotel in the path. The change
 *       is audited. At least one editable field must be provided; unknown fields are rejected.
 *
 *       Requires the `hotel.update` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *       - in: path
 *         name: policyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Policy UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               policyType:
 *                 type: string
 *                 enum: [cancellation, children, pets, payment, smoking, damage, age_restriction, internet, parking, breakfast, group_booking, additional_fees, other]
 *               title:
 *                 type: string
 *                 maxLength: 150
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *               icon:
 *                 type: string
 *                 maxLength: 50
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Policy updated; returns the refreshed policy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogPolicyResponse'
 *       400:
 *         description: Validation error, no editable fields provided (`NO_POLICY_CHANGES`), or missing hotel context
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
 *       403:
 *         description: Missing the `hotel.update` permission or no access to this hotel
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
 *         description: Policy not found (`POLICY_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Soft-delete a hotel policy (admin)
 *     description: |
 *       Marks a hotel policy inactive. Policies are kept for history and only hidden. The
 *       policy must belong to the hotel in the path. Audited.
 *
 *       Requires the `hotel.update` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *       - in: path
 *         name: policyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Policy UUID
 *     responses:
 *       200:
 *         description: Policy deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCatalogPolicyDeleteResponse'
 *       400:
 *         description: Validation error or missing hotel context
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
 *       403:
 *         description: Missing the `hotel.update` permission or no access to this hotel
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
 *         description: Policy not found (`POLICY_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
