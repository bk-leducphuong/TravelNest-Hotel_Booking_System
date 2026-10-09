/**
 * OpenAPI documentation extracted from modules/inventory/api/admin.routes.js.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 *
 * The router is mounted at /api/v1/admin/inventory. Every route requires a
 * bearer token and `requirePermission(..., { requireHotelContext: true })`.
 * Hotel context is resolved from `x-hotel-id` header, path/body/query `hotelId`,
 * or platform-staff status.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminInventoryRoomSummary:
 *       type: object
 *       description: Aggregated inventory summary for a room over the requested date range.
 *       properties:
 *         totalRooms:
 *           type: integer
 *         bookedRooms:
 *           type: integer
 *         heldRooms:
 *           type: integer
 *         availableRooms:
 *           type: integer
 *         avgPrice:
 *           type: number
 *           format: double
 *         minPrice:
 *           type: number
 *           format: double
 *         maxPrice:
 *           type: number
 *           format: double
 *         dayCount:
 *           type: integer
 *     AdminInventoryRoomListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             hotelId:
 *               type: string
 *               format: uuid
 *             startDate:
 *               type: string
 *               format: date
 *             endDate:
 *               type: string
 *               format: date
 *             rooms:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   roomId:
 *                     type: string
 *                     format: uuid
 *                   roomName:
 *                     type: string
 *                   roomType:
 *                     type: string
 *                     nullable: true
 *                   roomStatus:
 *                     type: string
 *                     enum: [active, inactive, maintenance]
 *                   quantity:
 *                     type: integer
 *                   hasInventory:
 *                     type: boolean
 *                     description: Whether any inventory rows exist for this room in the range.
 *                   inventory:
 *                     allOf:
 *                       - $ref: '#/components/schemas/AdminInventoryRoomSummary'
 *                     nullable: true
 *                     description: Null when the room has no inventory rows in the range.
 *     AdminInventoryOccupancyResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             hotelId:
 *               type: string
 *               format: uuid
 *             startDate:
 *               type: string
 *               format: date
 *             endDate:
 *               type: string
 *               format: date
 *             totalRooms:
 *               type: integer
 *             bookedRooms:
 *               type: integer
 *             heldRooms:
 *               type: integer
 *             availableRooms:
 *               type: integer
 *             avgPrice:
 *               type: number
 *               format: double
 *             occupancyRate:
 *               type: number
 *               format: double
 *               description: Percentage (0-100) of booked vs total rooms.
 *             dayCount:
 *               type: integer
 *             roomCount:
 *               type: integer
 *     AdminInventoryDay:
 *       type: object
 *       description: A single day of inventory for a room (a calendar cell).
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *         totalRooms:
 *           type: integer
 *         bookedRooms:
 *           type: integer
 *         heldRooms:
 *           type: integer
 *         availableRooms:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [open, close, sold_out, maintenance]
 *         pricePerNight:
 *           type: number
 *           format: double
 *         currency:
 *           type: string
 *     AdminInventoryRoomDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             roomId:
 *               type: string
 *               format: uuid
 *             roomName:
 *               type: string
 *             hotelId:
 *               type: string
 *               format: uuid
 *             startDate:
 *               type: string
 *               format: date
 *             endDate:
 *               type: string
 *               format: date
 *             days:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdminInventoryDay'
 *     AdminInventoryUpdateResponse:
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
 *             dateCount:
 *               type: integer
 *               description: Number of dates written.
 *             created:
 *               type: integer
 *               description: Number of inventory rows created.
 *             updated:
 *               type: integer
 *               description: Number of inventory rows updated.
 */

/**
 * @swagger
 * /admin/inventory/hotels/{hotelId}/rooms:
 *   get:
 *     summary: List room inventory summaries for a hotel (admin)
 *     description: |
 *       Rooms for a hotel plus an aggregated inventory summary per room for the requested
 *       range. This is the availability list the admin calendar loads.
 *
 *       When `startDate`/`endDate` are omitted the range defaults to today through today + 30 days.
 *
 *       Requires the `room.read` permission and hotel context.
 *     tags:
 *       - Inventory
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
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Inclusive start date (YYYY-MM-DD). Defaults to today.
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Inclusive end date (YYYY-MM-DD). Defaults to today + 30 days. Must be on or after startDate.
 *     responses:
 *       200:
 *         description: Room inventory summaries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminInventoryRoomListResponse'
 *       400:
 *         description: Validation error (unknown query fields are rejected), invalid date range, or missing hotel context
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
 */

/**
 * @swagger
 * /admin/inventory/hotels/{hotelId}/occupancy:
 *   get:
 *     summary: Get hotel occupancy summary (admin)
 *     description: |
 *       Occupancy / performance summary for a hotel over a range.
 *
 *       When `startDate`/`endDate` are omitted the range defaults to today through today + 30 days.
 *
 *       Requires the `room.read` permission and hotel context.
 *     tags:
 *       - Inventory
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
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Inclusive start date (YYYY-MM-DD). Defaults to today.
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Inclusive end date (YYYY-MM-DD). Defaults to today + 30 days. Must be on or after startDate.
 *     responses:
 *       200:
 *         description: Occupancy summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminInventoryOccupancyResponse'
 *       400:
 *         description: Validation error (unknown query fields are rejected), invalid date range, or missing hotel context
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
 */

/**
 * @swagger
 * /admin/inventory/rooms/{roomId}:
 *   get:
 *     summary: Get per-day inventory for a room (admin)
 *     description: |
 *       Raw per-day inventory for a room over a range (calendar cells).
 *
 *       When `startDate`/`endDate` are omitted the range defaults to today through today + 30 days.
 *
 *       Requires the `room.read` permission and hotel context. The hotel is not part of the
 *       path; supply it via the `x-hotel-id` header (or be platform staff).
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-hotel-id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel context for non-platform callers, since the hotel is not in the path.
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room UUID
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Inclusive start date (YYYY-MM-DD). Defaults to today.
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Inclusive end date (YYYY-MM-DD). Defaults to today + 30 days. Must be on or after startDate.
 *     responses:
 *       200:
 *         description: Per-day room inventory
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminInventoryRoomDetailResponse'
 *       400:
 *         description: Validation error (unknown query fields are rejected), invalid date range, or missing hotel context
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
 *         description: Room not found (`ROOM_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Bulk update room inventory (admin)
 *     description: |
 *       Bulk upsert inventory allotment / price / status for a room.
 *
 *       Provide either `entries[]` (one or more dated changes) or `startDate` (+ `endDate`)
 *       for a range. At least one of `entries` or `startDate` is required.
 *
 *       `bookedRooms` and `heldRooms` are never writable here; they are owned by the
 *       booking/hold flows. Admins edit allotment (`totalRooms`), price, currency and status.
 *
 *       Requires the `room.manage_inventory` permission and hotel context. The hotel is not
 *       part of the path; supply it via the `x-hotel-id` header (or be platform staff).
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-hotel-id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel context for non-platform callers, since the hotel is not in the path.
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
 *             description: Either `entries[]` or `startDate` (with `endDate`) must be provided.
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Range start date (YYYY-MM-DD) when not using `entries`.
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Range end date (YYYY-MM-DD). Must be on or after startDate. Range cannot exceed 366 days.
 *               pricePerNight:
 *                 type: number
 *                 format: double
 *                 minimum: 0
 *               totalRooms:
 *                 type: integer
 *                 minimum: 0
 *                 description: Allotment. Cannot be set below the number of rooms already booked on a date.
 *               status:
 *                 type: string
 *                 enum: [open, close, closed, sold_out, maintenance]
 *                 description: "'closed' is accepted as an alias and normalized to 'close'."
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
 *                 description: ISO currency code; uppercased and validated against the platform allow-list.
 *               reason:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *                 description: Optional audit reason.
 *               entries:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - date
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     pricePerNight:
 *                       type: number
 *                       format: double
 *                       minimum: 0
 *                     totalRooms:
 *                       type: integer
 *                       minimum: 0
 *                     status:
 *                       type: string
 *                       enum: [open, close, closed, sold_out, maintenance]
 *                     currency:
 *                       type: string
 *                       minLength: 3
 *                       maxLength: 3
 *     responses:
 *       200:
 *         description: Inventory updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminInventoryUpdateResponse'
 *       400:
 *         description: |
 *           Validation error, or one of: `MISSING_DATE_RANGE` (no entries and no startDate),
 *           `NO_INVENTORY_CHANGES` (no editable fields), `INVENTORY_PRICE_REQUIRED` (new row
 *           without a price), `INVALID_DATE` / `INVALID_DATE_RANGE` / `DATE_RANGE_TOO_LARGE`,
 *           `INVALID_INVENTORY_STATUS`, `INVALID_CURRENCY`, or missing hotel context.
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
 *         description: Missing the `room.manage_inventory` permission or no access to this hotel
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
 *       409:
 *         description: Cannot set `totalRooms` below the rooms already booked on a date (`INVENTORY_BELOW_BOOKED`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
