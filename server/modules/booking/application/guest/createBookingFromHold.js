const ApiError = require('@utils/ApiError');

const sequelize = require('@config/database.config');
const inventoryModule = require('@modules/inventory');
const { generateBookingCode } = require('../../domain/booking-code');
const holdService = require('../hold.service');
const pricingService = require('../pricing.service');
const holdRepository = require('../../infrastructure/hold.repository');
const bookingRepository = require('../../infrastructure/booking.repository');
const { paymentModule } = require('../../infrastructure/payment.client');

const { hashRequest } = require('../../domain/request-hash');
const { formatBookingResponse } = require('./formatters');

const PAYMENT_WINDOW_MINUTES = 15;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Create a pending-payment booking from an active hold.
 *
 * Idempotent: the same Idempotency-Key + request body replays the stored
 * response; a different body under the same key is rejected. The hold is
 * released, inventory reserved, booking + room rows + pending transaction
 * created, all inside one DB transaction.
 *
 * @param {number} userId
 * @param {{ holdId: string, specialRequests?: string, guestDetails?: object }} data
 * @param {string} idempotencyKey
 * @returns {Promise<object>} booking creation response
 */
async function createBookingFromHold(userId, data, idempotencyKey) {
  if (!idempotencyKey) {
    throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
  }

  const requestHash = hashRequest(data);
  const existingKey = await paymentModule().findIdempotencyRecord(userId, idempotencyKey);

  if (existingKey) {
    if (existingKey.request_hash !== requestHash) {
      throw new ApiError(
        409,
        'IDEMPOTENCY_KEY_REUSED',
        'Idempotency-Key was already used with a different request'
      );
    }
    if (existingKey.status === 'completed') {
      return {
        ...(existingKey.response_body || {}),
        idempotentReplay: true,
      };
    }
    throw new ApiError(409, 'REQUEST_IN_PROGRESS', 'This idempotent request is still processing');
  }

  let idempotencyRecord;
  try {
    idempotencyRecord = await paymentModule().createIdempotencyRecord({
      userId,
      idempotencyKey,
      requestHash,
      status: 'processing',
      expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    });
  } catch (err) {
    // Two identical requests can race between the lookup and the insert; the
    // unique (user_id, idempotency_key) constraint resolves the winner. Re-read
    // and replay/conflict exactly like the sequential path instead of 500ing.
    if (err && err.name === 'SequelizeUniqueConstraintError') {
      const raced = await paymentModule().findIdempotencyRecord(userId, idempotencyKey);
      if (raced) {
        if (raced.request_hash !== requestHash) {
          throw new ApiError(
            409,
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency-Key was already used with a different request'
          );
        }
        if (raced.status === 'completed') {
          return {
            ...(raced.response_body || {}),
            idempotentReplay: true,
          };
        }
        throw new ApiError(
          409,
          'REQUEST_IN_PROGRESS',
          'This idempotent request is still processing'
        );
      }
    }
    throw err;
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      const hold = await holdRepository.findByIdWithRooms(data.holdId, { transaction });

      if (!hold) {
        throw new ApiError(404, 'HOLD_NOT_FOUND', 'Hold not found');
      }
      if (hold.user_id !== userId) {
        throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to use this hold');
      }
      if (hold.status !== 'active') {
        throw new ApiError(400, 'HOLD_NOT_ACTIVE', `Hold is ${hold.status}`);
      }
      if (new Date(hold.expires_at) <= new Date()) {
        throw new ApiError(400, 'HOLD_EXPIRED', 'Your room hold has expired');
      }

      const holdRooms = (hold.holdRooms || []).map((room) => ({
        roomId: room.room_id,
        quantity: room.quantity,
      }));

      const quote = await pricingService.quote({
        hotelId: hold.hotel_id,
        rooms: holdRooms,
        checkInDate: hold.check_in_date,
        checkOutDate: hold.check_out_date,
      });

      await holdService.releaseHold(hold.id, userId, 'completed', { transaction });

      await inventoryModule.reserveRooms(
        {
          bookedRooms: holdRooms.map((room) => ({
            room_id: room.roomId,
            roomQuantity: room.quantity,
          })),
          checkInDate: hold.check_in_date,
          checkOutDate: hold.check_out_date,
        },
        { transaction }
      );

      const booking = await bookingRepository.create(
        {
          buyer_id: userId,
          hotel_id: hold.hotel_id,
          room_id: holdRooms[0]?.roomId || null,
          hold_id: hold.id,
          booking_code: generateBookingCode(),
          check_in_date: hold.check_in_date,
          check_out_date: hold.check_out_date,
          number_of_guests: hold.number_of_guests,
          quantity: hold.quantity,
          subtotal: quote.subtotal,
          tax_amount: quote.taxAmount,
          service_fee_amount: quote.serviceFeeAmount,
          platform_commission_amount: quote.platformCommissionAmount,
          total_price: quote.totalPrice,
          currency: quote.currency,
          status: 'pending_payment',
          special_requests: data.specialRequests || null,
          guest_details: data.guestDetails || null,
          price_breakdown: quote,
          cancellation_policy_snapshot: quote.cancellationPolicy,
          payment_due_at: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000),
          expires_at: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000),
        },
        { transaction }
      );

      await bookingRepository.bulkCreateBookingRooms(
        quote.rooms.map((room) => ({
          bookingId: booking.id,
          roomId: room.roomId,
          quantity: room.quantity,
          nightlyPriceSnapshot: room.nightly,
          subtotal: room.subtotal,
          totalPrice: room.totalPrice,
        })),
        { transaction }
      );

      const dbTransaction = await paymentModule().createTransaction(
        {
          bookingId: booking.id,
          buyerId: userId,
          hotelId: hold.hotel_id,
          amount: quote.totalPrice,
          currency: quote.currency,
          status: 'pending',
          transactionType: 'payment',
          metadata: {
            booking_code: booking.booking_code,
            hold_id: hold.id,
          },
        },
        { transaction }
      );

      const result = formatBookingResponse({
        booking,
        transaction: dbTransaction,
        quote,
      });

      await paymentModule().completeIdempotencyRecord(
        idempotencyRecord.id,
        {
          resourceType: 'booking',
          resourceId: booking.id,
          responseBody: result,
        },
        { transaction }
      );

      return result;
    });
  } catch (error) {
    await paymentModule()
      .failIdempotencyRecord(idempotencyRecord.id)
      .catch(() => {});
    throw error;
  }
}

module.exports = { createBookingFromHold };
