/**
 * OpenAPI documentation extracted from modules/payment/api/*.routes.js.
 *
 * Covers the guest payment path (modules/payment/api/guest.routes.js), the
 * Stripe webhook edge (modules/payment/api/webhook.routes.js) and the admin
 * payment/refund surface (modules/payment/api/admin.routes.js).
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentRecord:
 *       type: object
 *       description: A row from the `payments` table (card/provider details for a transaction).
 *       properties:
 *         id: { type: string, format: uuid }
 *         transaction_id: { type: string, format: uuid }
 *         amount: { type: number, format: double }
 *         currency: { type: string, example: USD }
 *         payment_method: { type: string, enum: [card, bank_transfer, wallet, cash, gift_card] }
 *         payment_status: { type: string, enum: [pending, processing, succeeded, failed, cancelled, refunded] }
 *         stripe_payment_method_id: { type: string, nullable: true }
 *         card_brand: { type: string, nullable: true, example: visa }
 *         card_last4: { type: string, nullable: true }
 *         card_exp_month: { type: integer, nullable: true }
 *         card_exp_year: { type: integer, nullable: true }
 *         failure_code: { type: string, nullable: true }
 *         failure_message: { type: string, nullable: true }
 *         receipt_url: { type: string, nullable: true }
 *         metadata: { type: object, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         paid_at: { type: string, format: date-time, nullable: true }
 *     PaymentTransactionBase:
 *       type: object
 *       description: A row from the `transactions` table.
 *       properties:
 *         id: { type: string, format: uuid }
 *         booking_id: { type: string, format: uuid, nullable: true }
 *         buyer_id: { type: string, format: uuid }
 *         hotel_id: { type: string, format: uuid }
 *         amount: { type: number, format: double }
 *         currency: { type: string, example: USD }
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled, refunded, partially_refunded]
 *         transaction_type: { type: string, enum: [payment, refund, payout] }
 *         payment_method: { type: string, nullable: true, example: card }
 *         stripe_payment_intent_id: { type: string, nullable: true }
 *         stripe_charge_id: { type: string, nullable: true }
 *         stripe_customer_id: { type: string, nullable: true }
 *         stripe_refund_id: { type: string, nullable: true }
 *         failure_code: { type: string, nullable: true }
 *         failure_message: { type: string, nullable: true }
 *         metadata: { type: object, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         completed_at: { type: string, format: date-time, nullable: true }
 *     PaymentTransaction:
 *       description: A transaction with its payment records and hotel.
 *       allOf:
 *         - $ref: '#/components/schemas/PaymentTransactionBase'
 *         - type: object
 *           properties:
 *             payments:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   payment_method: { type: string }
 *                   payment_status: { type: string }
 *                   amount: { type: number, format: double }
 *                   currency: { type: string }
 *                   paid_at: { type: string, format: date-time, nullable: true }
 *             hotel:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *     AdminTransaction:
 *       description: A transaction row as returned by the admin list (with booking + hotel).
 *       allOf:
 *         - $ref: '#/components/schemas/PaymentTransactionBase'
 *         - type: object
 *           properties:
 *             booking:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 booking_code: { type: string }
 *                 status: { type: string }
 *             hotel:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *     AdminTransactionDetail:
 *       description: Full admin transaction detail (payments, refunds, booking, hotel, buyer).
 *       allOf:
 *         - $ref: '#/components/schemas/PaymentTransactionBase'
 *         - type: object
 *           properties:
 *             payments:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   payment_method: { type: string }
 *                   payment_status: { type: string }
 *                   amount: { type: number, format: double }
 *                   currency: { type: string }
 *                   card_brand: { type: string, nullable: true }
 *                   card_last4: { type: string, nullable: true }
 *                   paid_at: { type: string, format: date-time, nullable: true }
 *             refunds:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   amount: { type: number, format: double }
 *                   currency: { type: string }
 *                   status: { type: string, enum: [pending, processing, succeeded, failed, cancelled] }
 *                   reason: { type: string }
 *                   provider_refund_id: { type: string, nullable: true }
 *                   processed_at: { type: string, format: date-time, nullable: true }
 *             booking:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 booking_code: { type: string }
 *                 check_in_date: { type: string, format: date }
 *                 check_out_date: { type: string, format: date }
 *                 status: { type: string }
 *             hotel:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *             transaction_buyer:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 first_name: { type: string, nullable: true }
 *                 last_name: { type: string, nullable: true }
 *                 email: { type: string, format: email, nullable: true }
 *     RefundRecord:
 *       type: object
 *       description: A row from the `refunds` table.
 *       properties:
 *         id: { type: string, format: uuid }
 *         booking_id: { type: string, format: uuid }
 *         transaction_id: { type: string, format: uuid }
 *         buyer_id: { type: string, format: uuid }
 *         hotel_id: { type: string, format: uuid }
 *         provider: { type: string, enum: [stripe] }
 *         provider_refund_id: { type: string, nullable: true, description: Stripe refund id (re_...) }
 *         amount: { type: number, format: double }
 *         currency: { type: string, example: USD }
 *         status: { type: string, enum: [pending, processing, succeeded, failed, cancelled] }
 *         reason:
 *           type: string
 *           enum: [free_cancellation, customer_request, hotel_cancelled, duplicate, fraudulent, other]
 *         eligibility: { type: string, enum: [eligible, ineligible, manual_review] }
 *         free_cancellation_deadline: { type: string, format: date-time, nullable: true }
 *         requested_at: { type: string, format: date-time }
 *         processed_at: { type: string, format: date-time, nullable: true }
 *         failure_code: { type: string, nullable: true }
 *         failure_message: { type: string, nullable: true }
 *         metadata: { type: object, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *     RefundDetail:
 *       description: A refund with its transaction, booking, hotel and buyer.
 *       allOf:
 *         - $ref: '#/components/schemas/RefundRecord'
 *         - type: object
 *           properties:
 *             transaction:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 booking_id: { type: string, format: uuid, nullable: true }
 *                 buyer_id: { type: string, format: uuid }
 *                 hotel_id: { type: string, format: uuid }
 *                 amount: { type: number, format: double }
 *                 currency: { type: string }
 *                 status: { type: string }
 *                 transaction_type: { type: string }
 *                 stripe_charge_id: { type: string, nullable: true }
 *                 stripe_payment_intent_id: { type: string, nullable: true }
 *             booking:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 booking_code: { type: string }
 *                 status: { type: string }
 *             hotel:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *             buyer:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 first_name: { type: string, nullable: true }
 *                 last_name: { type: string, nullable: true }
 *                 email: { type: string, format: email, nullable: true }
 *     HotelPaymentSummary:
 *       type: object
 *       properties:
 *         hotelId: { type: string, format: uuid }
 *         totalTransactions: { type: integer }
 *         byStatus:
 *           type: object
 *           description: Count of transactions keyed by status.
 *           additionalProperties: { type: integer }
 *           example: { completed: 12, refunded: 2 }
 *         grossAmount:
 *           type: number
 *           format: double
 *           description: Sum of completed / partially_refunded / refunded transaction amounts.
 *         refundedAmount: { type: number, format: double }
 *         netAmount: { type: number, format: double, description: grossAmount - refundedAmount }
 *     CreatePaymentIntentResult:
 *       type: object
 *       properties:
 *         clientSecret: { type: string, description: Stripe PaymentIntent client secret }
 *         paymentIntentId: { type: string, description: Stripe PaymentIntent id (pi_...) }
 *         status: { type: string, example: pending }
 *         bookingCode: { type: string }
 *         paymentDueAt: { type: string, format: date-time }
 *     RefundAttemptResult:
 *       type: object
 *       properties:
 *         refundId: { type: string, format: uuid }
 *         providerRefundId: { type: string, description: Stripe refund id (re_...) }
 *         status: { type: string, enum: [processing, succeeded, failed, cancelled] }
 *         amount: { type: number, format: double }
 *         currency: { type: string }
 *         transactionStatus:
 *           type: string
 *           enum: [refunded, partially_refunded]
 *           description: Resulting transaction status after the refund.
 *     StripeEvent:
 *       type: object
 *       description: Stripe webhook event envelope (raw JSON body).
 *       required: [id, type, data]
 *       properties:
 *         id: { type: string, description: Stripe event id (evt_...) }
 *         object: { type: string, enum: [event] }
 *         type:
 *           type: string
 *           description: |
 *             Stripe event type. Handled types: `payment_intent.succeeded`,
 *             `payment_intent.payment_failed`, `charge.refunded`, `payout.paid`,
 *             `payout.failed`. Any other type is logged and acknowledged with 200.
 *         created: { type: integer, description: Unix timestamp }
 *         livemode: { type: boolean }
 *         api_version: { type: string, nullable: true }
 *         data:
 *           type: object
 *           properties:
 *             object:
 *               type: object
 *               description: The Stripe object for the event (PaymentIntent, Charge, or Payout), passed through as-is.
 *             previous_attributes:
 *               type: object
 *               nullable: true
 *     WebhookAck:
 *       type: object
 *       properties:
 *         received: { type: boolean, example: true }
 *         duplicate:
 *           type: boolean
 *           description: Present and true when the event was already processed (idempotency hit).
 *     WebhookError:
 *       type: object
 *       properties:
 *         error: { type: string, example: "Invalid signature" }
 */

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: List the current user's payments
 *     description: |
 *       Returns a paginated list of the authenticated user's transactions (with their
 *       payment records and hotel). Ordered by `created_at` descending.
 *
 *       Requires a bearer token (`authenticate`).
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Page number (1-based).
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *         description: Page size (capped at 100).
 *     responses:
 *       200:
 *         description: Paginated list of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentTransaction'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *       400:
 *         description: Validation error (invalid pagination)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 */

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Create a payment intent for the current hold
 *     description: |
 *       Creates a Stripe PaymentIntent for the authenticated user's current active hold,
 *       releases the hold, reserves inventory and creates pending-payment bookings.
 *       The intent is created before the DB write; if the DB work fails the intent is
 *       cancelled as a compensating action.
 *
 *       The currency is fixed to `USD` for the hold (the optional `currency` field is
 *       validated but the hold amount is always charged in USD).
 *
 *       Requires a bearer token (`authenticate`).
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 minLength: 1
 *                 description: Stripe payment method id (pm_...)
 *                 example: "pm_1234567890"
 *               currency:
 *                 type: string
 *                 enum: [USD]
 *                 description: Optional; must be USD when supplied.
 *     responses:
 *       201:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CreatePaymentIntentResult'
 *       400:
 *         description: |
 *           Validation error, or a business error: `MISSING_REQUIRED_FIELDS`,
 *           `NO_ACTIVE_HOLD`, `HOLD_EXPIRED`, `HOLD_HAS_NO_ROOMS`, `INVALID_HOLD_AMOUNT`.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       500:
 *         description: Payment creation failed after the provider intent was created (`PAYMENT_CREATION_FAILED`).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       502:
 *         description: Payment provider error (`PAYMENT_PROVIDER_ERROR` or provider code).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /payments/bookings/{bookingId}:
 *   get:
 *     summary: Get the payment for a booking
 *     description: |
 *       Returns the transaction/payment associated with the given booking, scoped to the
 *       authenticated buyer (looked up by the booking's `booking_code`). Only the buyer
 *       may view it.
 *
 *       Requires a bearer token (`authenticate`).
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Booking UUID
 *     responses:
 *       200:
 *         description: Payment for the booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PaymentTransaction'
 *       400:
 *         description: Validation error (bookingId must be a UUID)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       403:
 *         description: Not the buyer of this payment (`FORBIDDEN`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Payment not found (`PAYMENT_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /payments/transactions/{transactionId}:
 *   get:
 *     summary: Get a payment transaction by ID
 *     description: |
 *       Returns a transaction by id, scoped to the authenticated buyer. Only the buyer
 *       may view it.
 *
 *       Requires a bearer token (`authenticate`).
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Transaction UUID
 *     responses:
 *       200:
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PaymentTransactionBase'
 *       400:
 *         description: Validation error (transactionId must be a UUID)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       403:
 *         description: Not the buyer of this payment (`FORBIDDEN`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Payment not found (`PAYMENT_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /webhooks/stripe:
 *   post:
 *     summary: Stripe webhook receiver
 *     description: |
 *       Receives Stripe events. The raw request body is parsed as JSON and verified
 *       against the `stripe-signature` header using the configured webhook secret.
 *
 *       **Handled event types:**
 *       - `payment_intent.succeeded` — records/updates the transaction and payment, confirms
 *         bookings, posts ledger entries, and enqueues confirmation email/notification.
 *       - `payment_intent.payment_failed` — marks the transaction `failed` and the booking
 *         `payment_failed`; enqueues a failure email when a receipt email is known.
 *       - `charge.refunded` — records the refund, updates the transaction to `refunded` /
 *         `partially_refunded`, cancels the booking and releases inventory on a full refund,
 *         and posts ledger entries.
 *       - `payout.paid` — sends the payout-completed notification.
 *       - `payout.failed` — sends the payout-failed notification.
 *
 *       Unrecognized event types are logged and acknowledged with **200**.
 *
 *       **Idempotency:** events already present in the webhook event log return
 *       `{ received: true, duplicate: true }` and are not reprocessed.
 *
 *       **Signature verification:** when `STRIPE_WEBHOOK_SECRET` is not configured the
 *       signature is not verified in non-production (the payload is parsed and processed
 *       as-is); in production a missing secret fails closed with **400**.
 *
 *       No bearer authentication is required — authenticity comes from the Stripe signature.
 *     tags:
 *       - Webhooks
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         required: true
 *         schema: { type: string }
 *         description: Stripe signature header used to verify the event.
 *     requestBody:
 *       required: true
 *       description: Raw Stripe event JSON (must be sent unmodified for signature verification).
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StripeEvent'
 *     responses:
 *       200:
 *         description: Event accepted (processed, unhandled, or duplicate)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookAck'
 *       400:
 *         description: 'Signature verification failed (`{ "error": "Invalid signature" }`)'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookError'
 *       500:
 *         description: 'Event processing failed (`{ "error": "Webhook processing failed" }`)'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookError'
 */

/**
 * @swagger
 * /admin/payments/transactions:
 *   get:
 *     summary: List payment transactions (admin)
 *     description: |
 *       Paginated transaction list for the admin payments view, ordered by `created_at`
 *       descending. Requires the `payment.read` permission. Hotel-scoped: when the request
 *       carries hotel context (e.g. `x-hotel-id`) it overrides the `hotelId` query filter.
 *       Can fail with 400 when hotel context is required but missing, and 401/403 for
 *       auth/permission failures.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Filter by hotel (overridden by hotel context when present).
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled, refunded, partially_refunded]
 *       - in: query
 *         name: transactionType
 *         required: false
 *         schema: { type: string, enum: [payment, refund, payout] }
 *       - in: query
 *         name: bookingId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: buyerId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema: { type: string, format: date-time }
 *         description: Inclusive lower bound on `created_at` (ISO date).
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema: { type: string, format: date-time }
 *         description: Inclusive upper bound on `created_at` (ISO date).
 *       - in: query
 *         name: page
 *         required: false
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminTransaction'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *       400:
 *         description: Validation error, or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     success: { type: boolean, example: false }
 *                     message: { type: string, example: "Hotel context is required for this operation." }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       403:
 *         description: Insufficient permissions (`payment.read`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 */

/**
 * @swagger
 * /admin/payments/transactions/{transactionId}:
 *   get:
 *     summary: Get a payment transaction (admin)
 *     description: |
 *       Returns a transaction with its payments, refunds, booking, hotel and buyer.
 *       Requires the `payment.read` permission and hotel context. Can fail with 400 when
 *       hotel context is missing, and 401/403 for auth/permission failures.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transaction detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/AdminTransactionDetail'
 *       400:
 *         description: Validation error, or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     success: { type: boolean, example: false }
 *                     message: { type: string }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       403:
 *         description: Insufficient permissions (`payment.read`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       404:
 *         description: Transaction not found (`TRANSACTION_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /admin/payments/hotels/{hotelId}/summary:
 *   get:
 *     summary: Hotel payment summary (admin)
 *     description: |
 *       Returns gross collected, refunded and net amounts plus a per-status transaction
 *       count for a hotel. Requires the `payment.read` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment summary for the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/HotelPaymentSummary'
 *       400:
 *         description: Validation error, or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     success: { type: boolean, example: false }
 *                     message: { type: string }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       403:
 *         description: Insufficient permissions (`payment.read`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 */

/**
 * @swagger
 * /admin/payments/transactions/{transactionId}/refunds:
 *   post:
 *     summary: Initiate a refund (admin)
 *     description: |
 *       Creates a Stripe refund (full or partial) for a payment transaction and records it.
 *       This is a financial operation only — it does not cancel the booking or release
 *       inventory. When `amount` is omitted the full remaining refundable balance is used.
 *
 *       Requires the `payment.refund` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: double
 *                 exclusiveMinimum: 0
 *                 description: Refund amount (major units). Defaults to the remaining refundable balance.
 *               reason:
 *                 type: string
 *                 enum: [free_cancellation, customer_request, hotel_cancelled, duplicate, fraudulent, other]
 *                 description: Defaults to `customer_request`.
 *     responses:
 *       201:
 *         description: Refund attempt result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RefundAttemptResult'
 *       400:
 *         description: |
 *           Validation error, or a business error: `NOT_A_PAYMENT_TRANSACTION`,
 *           `MISSING_PROVIDER_CHARGE`, `MISSING_BOOKING_REFERENCE`, `INVALID_REFUND_REASON`,
 *           `INVALID_REFUND_AMOUNT`, `REFUND_EXCEEDS_REMAINING`, or missing hotel context.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     success: { type: boolean, example: false }
 *                     message: { type: string }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       403:
 *         description: Insufficient permissions (`payment.refund`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       404:
 *         description: Transaction not found (`TRANSACTION_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: |
 *           Conflict: `REFUND_IN_PROGRESS`, `TRANSACTION_FULLY_REFUNDED`, or
 *           `TRANSACTION_NOT_REFUNDABLE`.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       502:
 *         description: Stripe refund failed (`REFUND_FAILED`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /admin/payments/refunds:
 *   get:
 *     summary: List refunds (admin)
 *     description: |
 *       Paginated refund list ordered by `requested_at` descending, each with its
 *       transaction, booking, hotel and buyer. Requires the `payment.read` permission and
 *       hotel context. Hotel context overrides the `hotelId` query filter when present.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         required: false
 *         schema: { type: string, enum: [pending, processing, succeeded, failed, cancelled] }
 *       - in: query
 *         name: transactionId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema: { type: string, format: date-time }
 *         description: Inclusive lower bound on `requested_at` (ISO date).
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema: { type: string, format: date-time }
 *         description: Inclusive upper bound on `requested_at` (ISO date).
 *       - in: query
 *         name: page
 *         required: false
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated refunds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RefundDetail'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *       400:
 *         description: Validation error, or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     success: { type: boolean, example: false }
 *                     message: { type: string }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       403:
 *         description: Insufficient permissions (`payment.read`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 */

/**
 * @swagger
 * /admin/payments/refunds/{refundId}:
 *   get:
 *     summary: Get a refund (admin)
 *     description: |
 *       Returns a refund with its transaction, booking, hotel and buyer. Requires the
 *       `payment.read` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: refundId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Refund detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RefundDetail'
 *       400:
 *         description: Validation error, or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     success: { type: boolean, example: false }
 *                     message: { type: string }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       403:
 *         description: Insufficient permissions (`payment.read`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       404:
 *         description: Refund not found (`REFUND_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /admin/payments/refunds/{refundId}/retry:
 *   post:
 *     summary: Retry a failed refund (admin)
 *     description: |
 *       Retries a previously failed refund by creating a fresh Stripe refund attempt on the
 *       same refund record. Only refunds in `failed` status can be retried.
 *
 *       Requires the `payment.refund` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: refundId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Refund attempt result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RefundAttemptResult'
 *       400:
 *         description: Validation error, or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     success: { type: boolean, example: false }
 *                     message: { type: string }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       403:
 *         description: Insufficient permissions (`payment.refund`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       404:
 *         description: Refund not found (`REFUND_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: |
 *           Conflict: `REFUND_NOT_RETRYABLE` (not in `failed` status),
 *           `REFUND_EXCEEDS_REMAINING`, or `TRANSACTION_NOT_REFUNDABLE`.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       502:
 *         description: Stripe refund failed (`REFUND_FAILED`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
