/**
 * OpenAPI documentation extracted from modules/payout/api/admin.routes.js.
 *
 * Covers the admin payout surface: payout listing/detail/summary, batch generation,
 * Stripe transfer execution, manual status overrides, and Stripe Connect connected
 * account management.
 *
 * Kept separate from the router so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PayoutRecord:
 *       type: object
 *       description: A row from the `payouts` table.
 *       properties:
 *         id: { type: string, format: uuid }
 *         hotel_id: { type: string, format: uuid }
 *         owner_id: { type: string, format: uuid }
 *         connected_payment_account_id: { type: string, format: uuid }
 *         transaction_id: { type: string, format: uuid, nullable: true }
 *         provider: { type: string, enum: [stripe] }
 *         provider_payout_id: { type: string, nullable: true }
 *         provider_transfer_id: { type: string, nullable: true, description: Stripe transfer id (tr_...) }
 *         amount: { type: number, format: double }
 *         currency: { type: string, example: USD }
 *         platform_fee_amount: { type: number, format: double }
 *         status: { type: string, enum: [pending, processing, paid, failed, cancelled] }
 *         period_start: { type: string, format: date-time, nullable: true }
 *         period_end: { type: string, format: date-time, nullable: true }
 *         paid_at: { type: string, format: date-time, nullable: true }
 *         failure_code: { type: string, nullable: true }
 *         failure_message: { type: string, nullable: true }
 *         metadata: { type: object, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *     PayoutDetail:
 *       description: A payout with its hotel, owner, connected account and source transaction.
 *       allOf:
 *         - $ref: '#/components/schemas/PayoutRecord'
 *         - type: object
 *           properties:
 *             hotel:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *             owner:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 email: { type: string, format: email }
 *                 first_name: { type: string, nullable: true }
 *                 last_name: { type: string, nullable: true }
 *             connected_payment_account:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 provider: { type: string, enum: [stripe] }
 *                 provider_account_id: { type: string, description: Stripe account id (acct_...) }
 *                 payouts_enabled: { type: boolean }
 *                 onboarding_status: { type: string, enum: [not_started, pending, completed, restricted, disabled] }
 *             transaction:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 booking_id: { type: string, format: uuid, nullable: true }
 *                 amount: { type: number, format: double }
 *                 currency: { type: string }
 *                 status: { type: string }
 *                 transaction_type: { type: string }
 *     PayoutWithItems:
 *       description: Payout detail including its payout items (only returned by the payout detail endpoint).
 *       allOf:
 *         - $ref: '#/components/schemas/PayoutDetail'
 *         - type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   payout_id: { type: string, format: uuid }
 *                   booking_id: { type: string, format: uuid }
 *                   transaction_id: { type: string, format: uuid, nullable: true }
 *                   gross_amount: { type: number, format: double }
 *                   platform_fee_amount: { type: number, format: double }
 *                   net_amount: { type: number, format: double }
 *                   currency: { type: string }
 *                   created_at: { type: string, format: date-time }
 *                   updated_at: { type: string, format: date-time }
 *     PayoutConnectedAccount:
 *       type: object
 *       description: A row from the `connected_payment_accounts` table (Stripe Connect mirror).
 *       properties:
 *         id: { type: string, format: uuid }
 *         user_id: { type: string, format: uuid, description: Owner who receives payouts. }
 *         hotel_id: { type: string, format: uuid, nullable: true }
 *         provider: { type: string, enum: [stripe] }
 *         provider_account_id: { type: string, description: Stripe account id (acct_...) }
 *         account_type: { type: string, enum: [express, standard, custom] }
 *         country: { type: string, nullable: true, example: US }
 *         default_currency: { type: string, nullable: true, example: USD }
 *         charges_enabled: { type: boolean }
 *         payouts_enabled: { type: boolean }
 *         details_submitted: { type: boolean }
 *         onboarding_status: { type: string, enum: [not_started, pending, completed, restricted, disabled] }
 *         disabled_reason: { type: string, nullable: true }
 *         requirements_currently_due: { type: array, nullable: true, items: { type: string } }
 *         requirements_eventually_due: { type: array, nullable: true, items: { type: string } }
 *         capabilities: { type: object, nullable: true }
 *         is_default: { type: boolean }
 *         last_synced_at: { type: string, format: date-time, nullable: true }
 *         metadata: { type: object, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         deleted_at: { type: string, format: date-time, nullable: true }
 *     HotelPayoutSummary:
 *       type: object
 *       properties:
 *         hotelId: { type: string, format: uuid }
 *         byStatus:
 *           type: object
 *           description: Totals keyed by payout status.
 *           additionalProperties:
 *             type: object
 *             properties:
 *               count: { type: integer }
 *               amount: { type: number, format: double }
 *           example: { paid: { count: 3, amount: 1500 }, pending: { count: 1, amount: 500 } }
 *         totalAmount: { type: number, format: double }
 *         paidAmount: { type: number, format: double }
 *         pendingAmount: { type: number, format: double, description: Sum of pending + processing. }
 *         payoutReady: { type: boolean, description: True when a completed, payouts-enabled connected account exists. }
 *     GenerateEligiblePayoutsResult:
 *       type: object
 *       properties:
 *         scanned: { type: integer, description: Number of eligible bookings scanned. }
 *         created: { type: integer, description: Number of payouts created. }
 *         payouts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PayoutRecord'
 *     CheckConnectedAccountResult:
 *       type: object
 *       properties:
 *         configured: { type: boolean, description: Whether the Stripe client is configured. }
 *         hasAccount: { type: boolean }
 *         payoutReady: { type: boolean }
 *         account:
 *           nullable: true
 *           allOf:
 *             - $ref: '#/components/schemas/PayoutConnectedAccount'
 *     AccountLinkResult:
 *       type: object
 *       properties:
 *         accountId: { type: string, format: uuid }
 *         providerAccountId: { type: string, description: Stripe account id (acct_...) }
 *         url: { type: string, format: uri, description: Hosted Stripe onboarding URL. }
 *         expiresAt: { type: integer, description: Unix timestamp when the link expires. }
 */

/**
 * @swagger
 * /admin/payouts:
 *   get:
 *     summary: List payouts (admin)
 *     description: |
 *       Paginated payout list ordered by `created_at` descending, each with its hotel,
 *       owner, connected account and source transaction. Requires the `payment.read`
 *       permission. Hotel-scoped: hotel context overrides the `hotelId` query filter when
 *       present. Can fail with 400 when hotel context is required but missing, and
 *       401/403 for auth/permission failures.
 *     tags:
 *       - Payouts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: ownerId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: connectedPaymentAccountId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: transactionId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         required: false
 *         schema: { type: string, enum: [pending, processing, paid, failed, cancelled] }
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
 *         description: Paginated payouts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PayoutDetail'
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
 * /admin/payouts/hotels/{hotelId}/summary:
 *   get:
 *     summary: Hotel payout summary (admin)
 *     description: |
 *       Returns payout totals by status, total/paid/pending amounts and connected-account
 *       payout readiness for a hotel. Requires the `payment.read` permission and hotel
 *       context.
 *     tags:
 *       - Payouts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payout summary for the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/HotelPayoutSummary'
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
 * /admin/payouts/eligible:
 *   post:
 *     summary: Generate eligible payouts (admin)
 *     description: |
 *       Scans confirmed/completed bookings (check-in on or before `cutoffDate`) with a
 *       completed payment transaction and creates a payout record per eligible booking that
 *       does not already have a payout item. Idempotent per booking (unique
 *       `payout_items.booking_id`).
 *
 *       Requires the `payment.process` permission and hotel context.
 *     tags:
 *       - Payouts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cutoffDate:
 *                 type: string
 *                 format: date-time
 *                 description: Only bookings with check-in on/before this date are eligible. Defaults to now.
 *               ownerId:
 *                 type: string
 *                 format: uuid
 *                 description: Restrict generation to a single owner.
 *     responses:
 *       201:
 *         description: Batch generation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GenerateEligiblePayoutsResult'
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
 *         description: Insufficient permissions (`payment.process`)
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
 * /admin/payouts/connected-accounts:
 *   get:
 *     summary: List connected accounts (admin)
 *     description: |
 *       Lists Stripe Connect accounts for a hotel or an owner (exactly one filter is
 *       required). Requires the `payment.read` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Required unless `ownerId` is provided.
 *       - in: query
 *         name: ownerId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Required unless `hotelId` is provided.
 *     responses:
 *       200:
 *         description: Connected accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PayoutConnectedAccount'
 *       400:
 *         description: Validation error, missing filter (`MISSING_FILTER`), or missing hotel context
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
 *   post:
 *     summary: Create a connected account (admin)
 *     description: |
 *       Creates a Stripe Connect account for an owner (optionally hotel-scoped) and stores
 *       the local mirror. Fails with 409 when an account already exists for the
 *       owner/hotel. Requires the `payment.process` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownerId
 *             properties:
 *               ownerId:
 *                 type: string
 *                 format: uuid
 *                 description: Owner user who will receive payouts.
 *               hotelId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional hotel-specific routing target.
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *               country:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 2
 *                 description: ISO 3166-1 alpha-2 country code (uppercased).
 *                 example: US
 *               accountType:
 *                 type: string
 *                 enum: [express, standard, custom]
 *                 default: express
 *               isDefault:
 *                 type: boolean
 *                 description: Mark as the preferred payout account for this owner/hotel.
 *     responses:
 *       201:
 *         description: Connected account created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PayoutConnectedAccount'
 *       400:
 *         description: Validation error, missing owner (`MISSING_OWNER`), or missing hotel context
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
 *         description: Insufficient permissions (`payment.process`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       409:
 *         description: A connected account already exists for this owner/hotel (`CONNECTED_ACCOUNT_EXISTS`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: Stripe is not configured (`STRIPE_NOT_CONFIGURED`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /admin/payouts/connected-accounts/check:
 *   get:
 *     summary: Check connected-account readiness (admin)
 *     description: |
 *       Reports whether Stripe is configured and whether the hotel/owner has a
 *       payout-ready connected account, returning the account when present. Exactly one of
 *       `hotelId` / `ownerId` is required. Requires the `payment.read` permission and hotel
 *       context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Required unless `ownerId` is provided.
 *       - in: query
 *         name: ownerId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Required unless `hotelId` is provided.
 *     responses:
 *       200:
 *         description: Connected-account readiness
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CheckConnectedAccountResult'
 *       400:
 *         description: Validation error, missing filter (`MISSING_FILTER`), or missing hotel context
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
 * /admin/payouts/connected-accounts/{accountId}/link:
 *   post:
 *     summary: Create a connected-account onboarding link (admin)
 *     description: |
 *       Creates (or refreshes) a Stripe hosted onboarding link so the owner can complete KYC.
 *       Defaults the refresh/return URLs to `CLIENT_HOST` when not supplied. Requires the
 *       `payment.process` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Local connected-account id.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshUrl:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Onboarding link
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/AccountLinkResult'
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
 *         description: Insufficient permissions (`payment.process`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       404:
 *         description: Connected account not found (`CONNECTED_ACCOUNT_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: Stripe is not configured (`STRIPE_NOT_CONFIGURED`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /admin/payouts/connected-accounts/{accountId}/sync:
 *   post:
 *     summary: Sync a connected account from Stripe (admin)
 *     description: |
 *       Pulls the latest account status from Stripe (charges/payouts enabled, requirements,
 *       capabilities, onboarding status) and mirrors it locally. Requires the
 *       `payment.process` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Local connected-account id.
 *     responses:
 *       200:
 *         description: Refreshed connected account
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PayoutConnectedAccount'
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
 *         description: Insufficient permissions (`payment.process`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       404:
 *         description: Connected account not found (`CONNECTED_ACCOUNT_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: Stripe is not configured (`STRIPE_NOT_CONFIGURED`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /admin/payouts/{payoutId}:
 *   get:
 *     summary: Get a payout (admin)
 *     description: |
 *       Returns a payout with its hotel, owner, connected account, source transaction and
 *       payout items. Requires the `payment.read` permission and hotel context.
 *     tags:
 *       - Payouts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payout detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PayoutWithItems'
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
 *         description: Payout not found (`PAYOUT_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /admin/payouts/{payoutId}/process:
 *   post:
 *     summary: Process a payout (admin)
 *     description: |
 *       Executes a `pending` payout: creates the Stripe transfer to the connected account,
 *       writes the ledger entry, marks the payout `paid` and notifies the owner. Only
 *       `pending` payouts can be processed.
 *
 *       Requires the `payment.process` permission and hotel context.
 *     tags:
 *       - Payouts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Processed payout
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PayoutDetail'
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
 *         description: Insufficient permissions (`payment.process`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       404:
 *         description: Payout not found (`PAYOUT_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Only pending payouts can be processed (`PAYOUT_NOT_PROCESSABLE`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       502:
 *         description: Stripe transfer failed (`PAYOUT_FAILED`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /admin/payouts/{payoutId}/status:
 *   patch:
 *     summary: Set a payout status (admin)
 *     description: |
 *       Manual payout status override (e.g. mark a stuck payout failed/cancelled, or
 *       reconcile a paid payout). Transitions are validated:
 *       `pending` -> processing | paid | failed | cancelled;
 *       `processing` -> paid | failed;
 *       `failed` -> pending | processing | cancelled;
 *       `paid` and `cancelled` are terminal.
 *
 *       Requires the `payment.process` permission and hotel context.
 *     tags:
 *       - Payouts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *                 enum: [pending, processing, paid, failed, cancelled]
 *               failureCode:
 *                 type: string
 *                 maxLength: 100
 *                 nullable: true
 *               failureMessage:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated payout
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PayoutDetail'
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
 *         description: Insufficient permissions (`payment.process`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *       404:
 *         description: Payout not found (`PAYOUT_NOT_FOUND`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Invalid status transition (`INVALID_PAYOUT_STATUS_TRANSITION`)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
