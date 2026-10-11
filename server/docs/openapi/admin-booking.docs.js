/**
 * OpenAPI documentation extracted from modules/booking/api/admin.routes.js.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminBookingBuyer:
 *       type: object
 *       description: Basic buyer information attached to an admin booking.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         first_name:
 *           type: string
 *           nullable: true
 *         last_name:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *     AdminBookingRoomRef:
 *       type: object
 *       description: Minimal room reference on an admin booking.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         room_name:
 *           type: string
 *           nullable: true
 *     AdminBookingHotelRef:
 *       type: object
 *       description: Minimal hotel reference on an admin booking.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           nullable: true
 *     AdminBookingPaymentRef:
 *       type: object
 *       description: Payment attached to the booking's transaction.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         payment_status:
 *           type: string
 *           nullable: true
 *         amount:
 *           type: number
 *           format: double
 *           nullable: true
 *         currency:
 *           type: string
 *           nullable: true
 *         card_brand:
 *           type: string
 *           nullable: true
 *         card_last4:
 *           type: string
 *           nullable: true
 *     AdminBookingRefundRef:
 *       type: object
 *       description: Refund attached to the booking's transaction.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *           format: double
 *           nullable: true
 *         currency:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           nullable: true
 *         reason:
 *           type: string
 *           nullable: true
 *         processed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     AdminBookingTransaction:
 *       allOf:
 *         - $ref: '#/components/schemas/BookingTransaction'
 *         - type: object
 *           properties:
 *             payments:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdminBookingPaymentRef'
 *             refunds:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdminBookingRefundRef'
 *     AdminBookingListItem:
 *       allOf:
 *         - $ref: '#/components/schemas/Booking'
 *         - type: object
 *           properties:
 *             buyer:
 *               nullable: true
 *               allOf:
 *                 - $ref: '#/components/schemas/AdminBookingBuyer'
 *             room:
 *               nullable: true
 *               allOf:
 *                 - $ref: '#/components/schemas/AdminBookingRoomRef'
 *             hotel:
 *               nullable: true
 *               allOf:
 *                 - $ref: '#/components/schemas/AdminBookingHotelRef'
 *     AdminBookingDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/AdminBookingListItem'
 *         - type: object
 *           properties:
 *             bookingRooms:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BookingRoomLine'
 *             transaction:
 *               nullable: true
 *               allOf:
 *                 - $ref: '#/components/schemas/AdminBookingTransaction'
 *     AdminBookingListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AdminBookingListItem'
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
 *     AdminBookingDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/AdminBookingDetail'
 *     AdminBookingStatsResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             hotelId:
 *               type: string
 *               format: uuid
 *             total:
 *               type: integer
 *               description: Total bookings for the hotel
 *             byStatus:
 *               type: object
 *               description: Booking count keyed by status
 *               additionalProperties:
 *                 type: integer
 *             arrivalsToday:
 *               type: integer
 *               description: Confirmed/checked-in bookings checking in today
 *             departuresToday:
 *               type: integer
 *               description: Checked-in/completed bookings checking out today
 *     AdminBookingTrendResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             hotelId:
 *               type: string
 *               format: uuid
 *             days:
 *               type: integer
 *             points:
 *               type: array
 *               description: Bookings created per day (missing days filled with 0)
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   count:
 *                     type: integer
 *     AdminBookingStatusResult:
 *       type: object
 *       properties:
 *         bookingId:
 *           type: string
 *           format: uuid
 *         previousStatus:
 *           type: string
 *           enum: [pending, pending_payment, confirmed, payment_failed, expired, checked_in, completed, cancelled, no_show]
 *         status:
 *           type: string
 *           enum: [confirmed, checked_in, completed, no_show]
 *     AdminBookingStatusResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/AdminBookingStatusResult'
 *     AdminBookingCancelResult:
 *       type: object
 *       properties:
 *         bookingId:
 *           type: string
 *           format: uuid
 *         previousStatus:
 *           type: string
 *           enum: [pending, pending_payment, confirmed, payment_failed, expired, checked_in, completed, cancelled, no_show]
 *         status:
 *           type: string
 *           enum: [cancelled]
 *         inventoryReleased:
 *           type: boolean
 *           description: Whether reserved inventory was released
 *         refund:
 *           type: object
 *           nullable: true
 *           description: Refund result from the Payment module (null when no refund was processed)
 *         refundError:
 *           type: string
 *           nullable: true
 *           description: Error message when a requested refund failed
 *     AdminBookingCancelResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/AdminBookingCancelResult'
 */

/**
 * @swagger
 * /admin/bookings:
 *   get:
 *     summary: List bookings (admin)
 *     description: |
 *       Paginated booking list for the back office.
 *
 *       **Requires the `booking.read` permission.** Hotel context is required for
 *       hotel-scoped callers: supply it via the `x-hotel-id` header or the `hotelId`
 *       query parameter. Platform staff (admin / support_agent) holding the permission
 *       may omit it for a global view.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by hotel. Also used to establish hotel context when no x-hotel-id header is sent.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, pending_payment, confirmed, payment_failed, expired, checked_in, completed, cancelled, no_show]
 *         description: Filter by booking status
 *       - in: query
 *         name: bookingCode
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by public booking code
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by primary room
 *       - in: query
 *         name: buyerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by buyer
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by created_at >= dateFrom (ISO date)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by created_at <= dateTo (ISO date)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBookingListResponse'
 *       400:
 *         description: |
 *           Validation error (`VALIDATION_ERROR` with `fields`), or hotel context is
 *           missing for a hotel-scoped caller (`{ success: false, message }`).
 *       401:
 *         description: "Not authenticated (`{ success: false, message }`)"
 *       403:
 *         description: "Insufficient permissions (`{ success: false, message }`)"
 */

/**
 * @swagger
 * /admin/bookings/hotels/{hotelId}/stats:
 *   get:
 *     summary: Get booking statistics for a hotel
 *     description: |
 *       Booking status breakdown plus today's arrivals and departures for the hotel.
 *
 *       **Requires the `booking.read` permission** and hotel context.
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
 *         description: Hotel UUID (also establishes hotel context)
 *     responses:
 *       200:
 *         description: Booking statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBookingStatsResponse'
 *       400:
 *         description: |
 *           Validation error (`VALIDATION_ERROR`), or hotel context is missing
 *           (`{ success: false, message }`).
 *       401:
 *         description: "Not authenticated (`{ success: false, message }`)"
 *       403:
 *         description: "Insufficient permissions (`{ success: false, message }`)"
 */

/**
 * @swagger
 * /admin/bookings/hotels/{hotelId}/trend:
 *   get:
 *     summary: Get booking creation trend for a hotel
 *     description: |
 *       Bookings created per day over the last `days` days. Missing days are filled
 *       with zero so the chart axis is continuous.
 *
 *       **Requires the `booking.read` permission** and hotel context.
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
 *         description: Hotel UUID (also establishes hotel context)
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 14
 *         description: Number of trailing days to include
 *     responses:
 *       200:
 *         description: Daily booking counts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBookingTrendResponse'
 *       400:
 *         description: |
 *           Validation error (`VALIDATION_ERROR`), or hotel context is missing
 *           (`{ success: false, message }`).
 *       401:
 *         description: "Not authenticated (`{ success: false, message }`)"
 *       403:
 *         description: "Insufficient permissions (`{ success: false, message }`)"
 */

/**
 * @swagger
 * /admin/bookings/{bookingId}:
 *   get:
 *     summary: Get a booking by ID (admin)
 *     description: |
 *       Returns a booking with its buyer, room, hotel, bookingRooms and transaction
 *       (including payments and refunds).
 *
 *       **Requires the `booking.read` permission** and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking UUID
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBookingDetailResponse'
 *       400:
 *         description: |
 *           Validation error (`VALIDATION_ERROR`), or hotel context is missing
 *           (`{ success: false, message }`).
 *       401:
 *         description: "Not authenticated (`{ success: false, message }`)"
 *       403:
 *         description: "Insufficient permissions (`{ success: false, message }`)"
 *       404:
 *         description: Booking not found (`BOOKING_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/bookings/{bookingId}/status:
 *   patch:
 *     summary: Update a booking status (admin)
 *     description: |
 *       Applies a generic status transition (confirm / check-in / complete / no-show).
 *       Cancellation is handled by the dedicated cancel endpoint. Invalid transitions
 *       return 409.
 *
 *       **Requires the `booking.manage` permission** and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, checked_in, completed, no_show]
 *                 description: Target status (cancellation is not allowed here)
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBookingStatusResponse'
 *       400:
 *         description: |
 *           Validation error (`VALIDATION_ERROR`), status is `cancelled`
 *           (`USE_CANCEL_ENDPOINT`), or hotel context is missing
 *           (`{ success: false, message }`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: "Not authenticated (`{ success: false, message }`)"
 *       403:
 *         description: "Insufficient permissions (`{ success: false, message }`)"
 *       404:
 *         description: Booking not found (`BOOKING_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Invalid status transition (`INVALID_BOOKING_STATUS_TRANSITION`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/bookings/{bookingId}/cancel:
 *   post:
 *     summary: Force-cancel a booking (admin)
 *     description: |
 *       Releases reserved inventory and cancels the booking, optionally refunding the
 *       attached payment transaction. Inventory release and the status change are one
 *       transaction; the refund is a separate cross-module call and a failure is
 *       reported in `refundError` rather than silently dropped.
 *
 *       **Requires the `booking.cancel` permission** and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *                 description: Cancellation reason (recorded in the audit log)
 *               processRefund:
 *                 type: boolean
 *                 default: false
 *                 description: When true, request a refund from the Payment module
 *               refundAmount:
 *                 type: number
 *                 format: double
 *                 exclusiveMinimum: 0
 *                 description: Optional explicit refund amount (defaults to the full transaction amount)
 *     responses:
 *       200:
 *         description: Booking cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBookingCancelResponse'
 *       400:
 *         description: |
 *           Validation error (`VALIDATION_ERROR`), or hotel context is missing
 *           (`{ success: false, message }`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: "Not authenticated (`{ success: false, message }`)"
 *       403:
 *         description: "Insufficient permissions (`{ success: false, message }`)"
 *       404:
 *         description: Booking not found (`BOOKING_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: |
 *           Booking is already cancelled or expired (`BOOKING_ALREADY_CANCELLED`),
 *           completed (`CANNOT_CANCEL_COMPLETED`), or the transition is not allowed
 *           (`INVALID_BOOKING_STATUS_TRANSITION`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
