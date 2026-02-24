/**
 * Hold API - Temporarily hold rooms during checkout
 * Prevents other users from booking the same room while the user completes payment.
 */

const express = require('express');
const {
  createHold,
  getMyHolds,
  getHoldById,
  releaseHold,
} = require('@controllers/v1/hold.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const holdSchema = require('@validators/v1/hold.schema');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /hold:
 *   post:
 *     summary: Create a temporary room hold
 *     description: |
 *       Creates a temporary hold for the given rooms and dates. Held rooms are removed from
 *       availability for other users until the hold expires or is released. Use this before
 *       creating a payment intent so the user can complete checkout without losing availability.
 *     tags:
 *       - Hold
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotelId
 *               - checkInDate
 *               - checkOutDate
 *               - rooms
 *             properties:
 *               hotelId:
 *                 type: string
 *                 format: uuid
 *                 description: Hotel UUID
 *               checkInDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-15"
 *                 description: Check-in date (YYYY-MM-DD)
 *               checkOutDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-18"
 *                 description: Check-out date (YYYY-MM-DD). Must be after checkInDate.
 *               numberOfGuests:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Number of guests
 *               rooms:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - roomId
 *                   properties:
 *                     roomId:
 *                       type: string
 *                       format: uuid
 *                       description: Room UUID
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       default: 1
 *                       description: Number of units of this room type
 *               currency:
 *                 type: string
 *                 length: 3
 *                 default: USD
 *                 example: USD
 *                 description: Currency code for total price
 *     responses:
 *       201:
 *         description: Hold created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     holdId:
 *                       type: string
 *                       format: uuid
 *                     checkInDate:
 *                       type: string
 *                       format: date
 *                     checkOutDate:
 *                       type: string
 *                       format: date
 *                     numberOfGuests:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                       description: Total number of rooms held
 *                     totalPrice:
 *                       type: number
 *                       format: double
 *                     currency:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [active]
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the hold expires (e.g. 15 min from creation)
 *                     rooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           roomId: { type: string, format: uuid }
 *                           quantity: { type: integer }
 *       400:
 *         description: Validation error or rooms not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       409:
 *         description: Rooms not available for the given dates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', validate(holdSchema.createHold), createHold);

/**
 * @swagger
 * /hold:
 *   get:
 *     summary: List active holds for the current user
 *     description: Returns all active (non-expired, non-released) holds for the authenticated user.
 *     tags:
 *       - Hold
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of active holds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       user_id: { type: string, format: uuid }
 *                       hotel_id: { type: string, format: uuid }
 *                       check_in_date: { type: string, format: date }
 *                       check_out_date: { type: string, format: date }
 *                       number_of_guests: { type: integer }
 *                       quantity: { type: integer }
 *                       total_price: { type: number }
 *                       totalPrice: { type: number }
 *                       currency: { type: string }
 *                       status: { type: string, enum: [active] }
 *                       expires_at: { type: string, format: date-time }
 *                       expiresAt: { type: string, format: date-time }
 *                       holdRooms:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             room_id: { type: string, format: uuid }
 *                             quantity: { type: integer }
 *       401:
 *         description: Not authenticated
 */
router.get('/', getMyHolds);

/**
 * @swagger
 * /hold/{holdId}:
 *   get:
 *     summary: Get a hold by ID
 *     description: Returns hold details. Only the owner can view the hold.
 *     tags:
 *       - Hold
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: holdId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hold UUID
 *     responses:
 *       200:
 *         description: Hold details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     user_id: { type: string, format: uuid }
 *                     hotel_id: { type: string, format: uuid }
 *                     check_in_date: { type: string, format: date }
 *                     check_out_date: { type: string, format: date }
 *                     number_of_guests: { type: integer }
 *                     quantity: { type: integer }
 *                     total_price: { type: number }
 *                     totalPrice: { type: number }
 *                     currency: { type: string }
 *                     status: { type: string, enum: [active, released, expired, completed] }
 *                     expires_at: { type: string, format: date-time }
 *                     isExpired: { type: boolean }
 *                     holdRooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           room_id: { type: string, format: uuid }
 *                           quantity: { type: integer }
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the owner of this hold
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Hold not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:holdId', validate(holdSchema.getHoldById), getHoldById);

/**
 * @swagger
 * /hold/{holdId}:
 *   delete:
 *     summary: Release a hold
 *     description: |
 *       Releases the hold and returns the rooms to availability. Use when the user
 *       cancels checkout or abandons payment. After release, the hold status becomes `released`.
 *     tags:
 *       - Hold
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: holdId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hold UUID
 *     responses:
 *       200:
 *         description: Hold released successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     holdId:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [released]
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the owner of this hold
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Hold not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Hold is not active (already released or expired)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:holdId', validate(holdSchema.releaseHold), releaseHold);

module.exports = router;
