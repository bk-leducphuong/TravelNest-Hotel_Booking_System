/**
 * OpenAPI documentation extracted from modules/booking/api/guest.routes.js.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       description: A booking row (bookings table).
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Booking identifier (UUIDv7)
 *         buyer_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who booked
 *         hotel_id:
 *           type: string
 *           format: uuid
 *           description: Hotel the booking belongs to
 *         room_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Legacy primary room pointer. New bookings use bookingRooms.
 *         hold_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Hold this booking was created from
 *         booking_code:
 *           type: string
 *           description: Public booking code
 *         check_in_date:
 *           type: string
 *           format: date
 *         check_out_date:
 *           type: string
 *           format: date
 *         number_of_guests:
 *           type: integer
 *         quantity:
 *           type: integer
 *           description: Number of rooms booked
 *         subtotal:
 *           type: number
 *           format: double
 *         tax_amount:
 *           type: number
 *           format: double
 *         service_fee_amount:
 *           type: number
 *           format: double
 *         platform_commission_amount:
 *           type: number
 *           format: double
 *         total_price:
 *           type: number
 *           format: double
 *         currency:
 *           type: string
 *           example: USD
 *         status:
 *           type: string
 *           enum: [pending, pending_payment, confirmed, payment_failed, expired, checked_in, completed, cancelled, no_show]
 *         special_requests:
 *           type: string
 *           nullable: true
 *         guest_details:
 *           type: object
 *           nullable: true
 *           description: Guest contact details captured at checkout
 *         price_breakdown:
 *           type: object
 *           nullable: true
 *           description: Pricing snapshot (quote) stored at booking creation
 *         cancellation_policy_snapshot:
 *           type: object
 *           nullable: true
 *           description: Cancellation policy snapshot stored at booking creation
 *         payment_due_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Deadline to pay for a pending-payment booking
 *         confirmed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancelled_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         expires_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         deleted_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     BookingImage:
 *       type: object
 *       description: Active image attached to a hotel.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         object_key:
 *           type: string
 *           description: MinIO object key
 *         is_primary:
 *           type: boolean
 *           nullable: true
 *         display_order:
 *           type: integer
 *           nullable: true
 *     BookingHotel:
 *       type: object
 *       description: Hotel summary enriched for legacy guest clients.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         city_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *           description: Legacy city string (city name), not an object
 *         image_urls:
 *           type: array
 *           description: Legacy alias of the hotel's active images
 *           items:
 *             $ref: '#/components/schemas/BookingImage'
 *     BookingRoomSummary:
 *       type: object
 *       description: Minimal room summary returned by guest reads.
 *       properties:
 *         room_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         room_name:
 *           type: string
 *           nullable: true
 *     BookingRoomLine:
 *       type: object
 *       description: A booking_rooms row, optionally with its room.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         booking_id:
 *           type: string
 *           format: uuid
 *         room_id:
 *           type: string
 *           format: uuid
 *         quantity:
 *           type: integer
 *         nightly_price_snapshot:
 *           type: object
 *           nullable: true
 *           description: Per-night price snapshot captured at booking creation
 *         subtotal:
 *           type: number
 *           format: double
 *         total_price:
 *           type: number
 *           format: double
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         room:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             room_name:
 *               type: string
 *     BookingTransaction:
 *       type: object
 *       description: Payment transaction attached to a booking.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         booking_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         buyer_id:
 *           type: string
 *           format: uuid
 *         hotel_id:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *           format: double
 *         currency:
 *           type: string
 *           example: USD
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled, refunded, partially_refunded]
 *         transaction_type:
 *           type: string
 *           enum: [payment, refund, payout]
 *         payment_method:
 *           type: string
 *           nullable: true
 *         stripe_payment_intent_id:
 *           type: string
 *           nullable: true
 *         stripe_charge_id:
 *           type: string
 *           nullable: true
 *         stripe_refund_id:
 *           type: string
 *           nullable: true
 *         failure_code:
 *           type: string
 *           nullable: true
 *         failure_message:
 *           type: string
 *           nullable: true
 *         metadata:
 *           type: object
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         completed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     GuestBookingSummary:
 *       allOf:
 *         - $ref: '#/components/schemas/Booking'
 *         - type: object
 *           properties:
 *             hotel:
 *               $ref: '#/components/schemas/BookingHotel'
 *             room:
 *               $ref: '#/components/schemas/BookingRoomSummary'
 *     GuestBookingDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/Booking'
 *         - type: object
 *           properties:
 *             bookingRooms:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BookingRoomLine'
 *             transaction:
 *               nullable: true
 *               allOf:
 *                 - $ref: '#/components/schemas/BookingTransaction'
 *             hotel:
 *               $ref: '#/components/schemas/BookingHotel'
 *             room:
 *               $ref: '#/components/schemas/BookingRoomSummary'
 *     GuestBookingByCodeDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/Booking'
 *         - type: object
 *           properties:
 *             bookingRooms:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BookingRoomLine'
 *             hotel:
 *               type: object
 *               nullable: true
 *               description: Raw hotel row (not legacy-formatted)
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 city_id:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                 address:
 *                   type: string
 *                   nullable: true
 *             transaction:
 *               nullable: true
 *               allOf:
 *                 - $ref: '#/components/schemas/BookingTransaction'
 *     BookingCreationPrice:
 *       type: object
 *       properties:
 *         subtotal:
 *           type: number
 *           format: double
 *         taxAmount:
 *           type: number
 *           format: double
 *         serviceFeeAmount:
 *           type: number
 *           format: double
 *         platformCommissionAmount:
 *           type: number
 *           format: double
 *         totalPrice:
 *           type: number
 *           format: double
 *         currency:
 *           type: string
 *           example: USD
 *     BookingCreationRoom:
 *       type: object
 *       properties:
 *         roomId:
 *           type: string
 *           format: uuid
 *         quantity:
 *           type: integer
 *         nightly:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               price:
 *                 type: number
 *                 format: double
 *               quantity:
 *                 type: integer
 *               total:
 *                 type: number
 *                 format: double
 *         subtotal:
 *           type: number
 *           format: double
 *         totalPrice:
 *           type: number
 *           format: double
 *     BookingPolicySnapshot:
 *       type: object
 *       description: Cancellation policy snapshot stored on the booking.
 *       properties:
 *         rooms:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               roomId:
 *                 type: string
 *                 format: uuid
 *               ruleId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               isRefundable:
 *                 type: boolean
 *               freeCancellationUntilHoursBeforeCheckin:
 *                 type: integer
 *                 nullable: true
 *               refundPercentBeforeDeadline:
 *                 type: number
 *                 format: double
 *               refundPercentAfterDeadline:
 *                 type: number
 *                 format: double
 *     BookingCancellationPolicyEvaluation:
 *       type: object
 *       description: Result of evaluating the cancellation policy at cancel time.
 *       properties:
 *         eligible:
 *           type: boolean
 *         eligibility:
 *           type: string
 *           enum: [eligible, ineligible, manual_review]
 *         reason:
 *           type: string
 *           enum: [no_structured_rule, non_refundable_rule, free_cancellation, customer_request]
 *         refundAmount:
 *           type: number
 *           format: double
 *         refundPercent:
 *           type: number
 *           format: double
 *         currency:
 *           type: string
 *           example: USD
 *         isRefundable:
 *           type: boolean
 *         ruleId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         freeCancellationDeadline:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         isWithinFreeCancellationWindow:
 *           type: boolean
 *     BookingRefund:
 *       type: object
 *       description: Refund result mapped onto the legacy guest shape.
 *       properties:
 *         refundId:
 *           type: string
 *           nullable: true
 *           description: Provider (Stripe) refund ID
 *         amount:
 *           type: number
 *           format: double
 *         currency:
 *           type: string
 *           example: USD
 *         status:
 *           type: string
 *           enum: [pending, processing, succeeded, failed, cancelled]
 *         refundRecordId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Internal refunds-table ID
 *     BookingCreationResult:
 *       type: object
 *       properties:
 *         bookingId:
 *           type: string
 *           format: uuid
 *         bookingCode:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, pending_payment, confirmed, payment_failed, expired, checked_in, completed, cancelled, no_show]
 *         paymentDueAt:
 *           type: string
 *           format: date-time
 *         transactionId:
 *           type: string
 *           format: uuid
 *         price:
 *           $ref: '#/components/schemas/BookingCreationPrice'
 *         rooms:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BookingCreationRoom'
 *         cancellationPolicy:
 *           $ref: '#/components/schemas/BookingPolicySnapshot'
 *         idempotentReplay:
 *           type: boolean
 *           description: Present and true only when the response was replayed from a prior request with the same Idempotency-Key
 *     BookingPaymentIntent:
 *       type: object
 *       properties:
 *         clientSecret:
 *           type: string
 *           nullable: true
 *           description: Stripe PaymentIntent client secret
 *         paymentIntentId:
 *           type: string
 *           description: Stripe PaymentIntent ID
 *         status:
 *           type: string
 *           description: Stripe PaymentIntent status
 *         bookingId:
 *           type: string
 *           format: uuid
 *         bookingCode:
 *           type: string
 *     GuestBookingListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GuestBookingSummary'
 *     GuestBookingDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/GuestBookingDetail'
 *     GuestBookingByCodeResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/GuestBookingByCodeDetail'
 *     BookingCreationResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/BookingCreationResult'
 *     BookingPaymentIntentResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/BookingPaymentIntent'
 *     GuestBookingCancelResult:
 *       type: object
 *       properties:
 *         bookingId:
 *           type: string
 *           format: uuid
 *         bookingCode:
 *           type: string
 *         message:
 *           type: string
 *           example: Booking cancelled successfully
 *         refundProcessed:
 *           type: boolean
 *         cancellationPolicy:
 *           $ref: '#/components/schemas/BookingCancellationPolicyEvaluation'
 *         refund:
 *           nullable: true
 *           allOf:
 *             - $ref: '#/components/schemas/BookingRefund'
 *     GuestBookingCancelResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/GuestBookingCancelResult'
 */

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a booking from a hold
 *     description: |
 *       Creates a `pending_payment` booking from an active hold. The hold is released,
 *       inventory is reserved, and a pending payment transaction is created in a single
 *       DB transaction. The response is idempotent: replaying the same `Idempotency-Key`
 *       with the same request body returns the stored result (`idempotentReplay: true`).
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Required. Missing header returns 400 IDEMPOTENCY_KEY_REQUIRED.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - holdId
 *             properties:
 *               holdId:
 *                 type: string
 *                 format: uuid
 *                 description: Active hold to convert into a booking
 *               guestDetails:
 *                 type: object
 *                 description: Optional guest contact details
 *                 properties:
 *                   fullName:
 *                     type: string
 *                     nullable: true
 *                   email:
 *                     type: string
 *                     format: email
 *                     nullable: true
 *                   phoneNumber:
 *                     type: string
 *                     nullable: true
 *                   country:
 *                     type: string
 *                     nullable: true
 *                   bookingFor:
 *                     type: string
 *                     nullable: true
 *                   travellingForWork:
 *                     type: boolean
 *               specialRequests:
 *                 type: string
 *                 maxLength: 5000
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Booking created (or replayed)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingCreationResponse'
 *       400:
 *         description: |
 *           Missing Idempotency-Key (`IDEMPOTENCY_KEY_REQUIRED`), validation error
 *           (`VALIDATION_ERROR` with `fields`), hold not active (`HOLD_NOT_ACTIVE`),
 *           hold expired (`HOLD_EXPIRED`), invalid date range (`INVALID_DATE_RANGE`),
 *           or invalid rooms (`INVALID_ROOMS`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Hold belongs to another user (`FORBIDDEN`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Hold not found (`HOLD_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: |
 *           Idempotency-Key reused with a different body (`IDEMPOTENCY_KEY_REUSED`) or
 *           an identical request is still processing (`REQUEST_IN_PROGRESS`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: List the current user's bookings
 *     description: |
 *       Returns the authenticated user's bookings, most recent first, each enriched with
 *       its hotel and room. Booking statuses are refreshed against the current date before
 *       the list is returned.
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeCancelled
 *         schema:
 *           type: boolean
 *           default: false
 *         description: When true, cancelled bookings are included (excluded by default)
 *     responses:
 *       200:
 *         description: List of the user's bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GuestBookingListResponse'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /bookings/code/{bookingCode}:
 *   get:
 *     summary: Get a booking by its public code
 *     description: |
 *       Looks up a booking by its public `bookingCode`, scoped to the authenticated buyer.
 *       Returns the booking with its bookingRooms, hotel and transaction. No query
 *       parameters are accepted.
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingCode
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Public booking code
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GuestBookingByCodeResponse'
 *       400:
 *         description: Validation error (`VALIDATION_ERROR` with `fields`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Booking not found (`BOOKING_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /bookings/{bookingId}/payment-intent:
 *   post:
 *     summary: Create or reuse a payment intent for a booking
 *     description: |
 *       Creates a Stripe PaymentIntent for a `pending_payment` booking owned by the
 *       authenticated user, or returns the existing one if the booking's transaction
 *       already has a Stripe PaymentIntent.
 *     tags:
 *       - Bookings
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
 *               paymentMethodId:
 *                 type: string
 *                 nullable: true
 *                 description: Stripe payment method ID (optional)
 *               paymentMethod:
 *                 type: string
 *                 nullable: true
 *                 description: Payment method type label (defaults to card)
 *     responses:
 *       201:
 *         description: Payment intent created or reused
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingPaymentIntentResponse'
 *       400:
 *         description: |
 *           Validation error (`VALIDATION_ERROR`), booking is not pending payment
 *           (`BOOKING_NOT_PENDING_PAYMENT`), or the payment window has expired
 *           (`BOOKING_PAYMENT_EXPIRED`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Booking not found (`BOOKING_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Pending transaction not found (`TRANSACTION_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /bookings/{bookingId}:
 *   get:
 *     summary: Get a booking by ID
 *     description: |
 *       Returns a booking owned by the authenticated user, including its bookingRooms,
 *       transaction, hotel and primary room. No query parameters are accepted.
 *     tags:
 *       - Bookings
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
 *               $ref: '#/components/schemas/GuestBookingDetailResponse'
 *       400:
 *         description: Validation error (`VALIDATION_ERROR` with `fields`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Booking not found or not owned by the user (`BOOKING_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /bookings/{bookingId}:
 *   delete:
 *     summary: Cancel a booking
 *     description: |
 *       Cancels a booking owned by the authenticated user, releasing reserved inventory.
 *       When `processRefund=true` and the evaluated cancellation policy yields a positive
 *       refund amount, a refund is requested from the Payment module. Refund failures do
 *       not block cancellation; the `refund` field is then null.
 *     tags:
 *       - Bookings
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
 *       - in: query
 *         name: processRefund
 *         schema:
 *           type: boolean
 *           default: false
 *         description: When true, attempt to refund the booking per its cancellation policy
 *     responses:
 *       200:
 *         description: Booking cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GuestBookingCancelResponse'
 *       400:
 *         description: |
 *           Booking already cancelled (`ALREADY_CANCELLED`) or completed
 *           (`CANNOT_CANCEL_COMPLETED`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Booking not found or not owned by the user (`BOOKING_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Booking was cancelled concurrently (`BOOKING_ALREADY_CANCELLED`)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
