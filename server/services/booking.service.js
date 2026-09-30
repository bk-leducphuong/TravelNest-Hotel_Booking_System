const nodeCrypto = require('crypto');

const bookingRepository = require('@repositories/booking.repository');
const holdRepository = require('@repositories/hold.repository');
const idempotencyRepository = require('@repositories/idempotency.repository');
const transactionRepository = require('@repositories/transaction.repository');
const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');
const inventoryService = require('@services/inventory.service');
const holdService = require('@services/hold.service');
const pricingService = require('@services/pricing.service');
const sequelize = require('@config/database.config');
const StripePaymentAdapter = require('@adapters/payment/stripePayment.adapter');
const { generateBookingCode } = require('@utils/booking.utils');
const { Transaction } = require('sequelize');

class BookingService {
  constructor() {
    this.paymentProvider = new StripePaymentAdapter();
  }

  async createBookingFromHold(userId, data, idempotencyKey) {
    if (!idempotencyKey) {
      throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required');
    }

    const requestHash = this.hashRequest(data);
    const existingKey = await idempotencyRepository.findByUserAndKey(userId, idempotencyKey);

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

    const idempotencyRecord = await idempotencyRepository.create({
      userId,
      idempotencyKey,
      requestHash,
      status: 'processing',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      const response = await sequelize.transaction(async (transaction) => {
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

        await inventoryService.reserveRooms(
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
            payment_due_at: new Date(Date.now() + 15 * 60 * 1000),
            expires_at: new Date(Date.now() + 15 * 60 * 1000),
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

        const dbTransaction = await transactionRepository.create(
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

        const result = this.formatBookingResponse({
          booking,
          transaction: dbTransaction,
          quote,
        });

        await idempotencyRepository.markCompleted(
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

      return response;
    } catch (error) {
      await idempotencyRepository.markFailed(idempotencyRecord.id).catch(() => {});
      throw error;
    }
  }

  async createPaymentIntentForBooking(bookingId, userId, data = {}) {
    const booking = await bookingRepository.findPaymentContextByIdAndBuyerId(bookingId, userId);

    if (!booking) {
      throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    const bookingData = booking.toJSON ? booking.toJSON() : booking;
    if (bookingData.status !== 'pending_payment') {
      throw new ApiError(
        400,
        'BOOKING_NOT_PENDING_PAYMENT',
        'Only pending payment bookings can create a payment intent'
      );
    }

    if (bookingData.payment_due_at && new Date(bookingData.payment_due_at) <= new Date()) {
      throw new ApiError(400, 'BOOKING_PAYMENT_EXPIRED', 'Booking payment window expired');
    }

    const dbTransaction = bookingData.transaction;
    if (!dbTransaction) {
      throw new ApiError(500, 'TRANSACTION_NOT_FOUND', 'Pending transaction not found');
    }

    if (dbTransaction.stripe_payment_intent_id) {
      const payment = await this.paymentProvider.getPayment(dbTransaction.stripe_payment_intent_id);
      return {
        clientSecret: payment.raw?.client_secret,
        paymentIntentId: payment.id,
        status: payment.status,
        bookingId: bookingData.id,
        bookingCode: bookingData.booking_code,
      };
    }

    const payment = await this.paymentProvider.createPayment({
      amount: this.toMinorUnits(bookingData.total_price, 'USD'),
      currency: 'USD',
      paymentMethodId: data.paymentMethodId,
      returnUrl: process.env.CLIENT_HOST
        ? `${process.env.CLIENT_HOST}/book/complete`
        : 'http://localhost:5173/book/complete',
      metadata: {
        booking_id: bookingData.id,
        booking_code: bookingData.booking_code,
        transaction_id: dbTransaction.id,
        hotel_id: bookingData.hotel_id,
        buyer_id: userId,
      },
    });

    await transactionRepository.update(dbTransaction.id, {
      paymentIntentId: payment.id,
      paymentMethod: data.paymentMethod || 'card',
      metadata: {
        ...(dbTransaction.metadata || {}),
        booking_code: bookingData.booking_code,
        stripe_payment_intent_status: payment.status,
      },
    });

    return {
      clientSecret: payment.clientSecret,
      paymentIntentId: payment.id,
      status: payment.status,
      bookingId: bookingData.id,
      bookingCode: bookingData.booking_code,
    };
  }

  async expireBookingIfDue(bookingId) {
    const transaction = await sequelize.transaction();

    try {
      const booking = await bookingRepository.findExpiryContextById(bookingId, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      if (!booking) {
        await transaction.rollback();
        return null;
      }

      const bookingData = booking.toJSON ? booking.toJSON() : booking;
      const isPending = ['pending', 'pending_payment'].includes(bookingData.status);
      const expiresAt = bookingData.expires_at ? new Date(bookingData.expires_at) : null;

      if (!isPending || !expiresAt || expiresAt > new Date()) {
        await transaction.rollback();
        return null;
      }

      const bookingRooms =
        bookingData.bookingRooms && bookingData.bookingRooms.length > 0
          ? bookingData.bookingRooms.map((room) => ({
              room_id: room.room_id,
              roomQuantity: room.quantity,
            }))
          : [
              {
                room_id: bookingData.room_id,
                roomQuantity: bookingData.quantity || 1,
              },
            ].filter((room) => room.room_id);

      if (bookingRooms.length > 0) {
        await inventoryService.releaseRooms(
          {
            bookedRooms: bookingRooms,
            checkInDate: bookingData.check_in_date,
            checkOutDate: bookingData.check_out_date,
          },
          { transaction }
        );
      }

      await bookingRepository.update(
        bookingId,
        {
          status: 'expired',
          cancelled_at: new Date(),
        },
        { transaction }
      );

      const dbTransaction = booking.transaction;
      if (dbTransaction && ['pending', 'processing'].includes(dbTransaction.status)) {
        await transactionRepository.update(
          dbTransaction.id,
          {
            status: 'cancelled',
            metadata: {
              ...(dbTransaction.metadata || {}),
              cancellation_reason: 'booking_expired',
              expired_at: new Date().toISOString(),
            },
          },
          { transaction }
        );
      }

      await transaction.commit();

      if (dbTransaction?.stripe_payment_intent_id) {
        await this.cancelExpiredPaymentIntent(dbTransaction.stripe_payment_intent_id, bookingId);
      }

      logger.info('Booking expired', {
        bookingId: bookingData.id,
        bookingCode: bookingData.booking_code,
        buyerId: bookingData.buyer_id,
      });

      return {
        bookingId: bookingData.id,
        bookingCode: bookingData.booking_code,
        buyerId: bookingData.buyer_id,
        hotelId: bookingData.hotel_id,
        checkInDate: bookingData.check_in_date,
        checkOutDate: bookingData.check_out_date,
        paymentDueAt: bookingData.payment_due_at,
        expiredAt: new Date(),
      };
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      logger.error('Expire booking failed:', {
        bookingId,
        error: error.message,
      });
      throw error;
    }
  }

  async expirePendingBookings(options = {}) {
    const expired = await bookingRepository.findExpiredPending({
      limit: options.limit || 100,
      order: [['expires_at', 'ASC']],
    });

    let released = 0;
    const expiredBookings = [];

    for (const booking of expired) {
      try {
        const expiredBooking = await this.expireBookingIfDue(booking.id);

        if (expiredBooking) {
          expiredBookings.push(expiredBooking);
          released++;
        }
      } catch (err) {
        logger.error('Failed to expire pending booking', {
          bookingId: booking.id,
          error: err.message,
        });
      }
    }

    return { processed: expired.length, released, expiredBookings };
  }

  async cancelExpiredPaymentIntent(paymentIntentId, bookingId) {
    try {
      const payment = await this.paymentProvider.getPayment(paymentIntentId);
      const cancellableStatuses = ['pending', 'processing', 'requires_payment_method'];

      if (!cancellableStatuses.includes(payment.status) && payment.status !== 'requires_action') {
        logger.warn('Expired booking payment intent is not cancellable', {
          bookingId,
          paymentIntentId,
          status: payment.status,
        });
        return null;
      }

      return await this.paymentProvider.cancelPayment(paymentIntentId);
    } catch (error) {
      logger.warn('Failed to cancel expired booking payment intent', {
        bookingId,
        paymentIntentId,
        error: error.message,
      });
      return null;
    }
  }

  hashRequest(data) {
    return nodeCrypto
      .createHash('sha256')
      .update(this.stableStringify(data || {}))
      .digest('hex');
  }

  stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`)
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }

  formatBookingResponse({ booking, transaction, quote }) {
    return {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      status: booking.status,
      paymentDueAt: booking.payment_due_at,
      transactionId: transaction.id,
      price: {
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        serviceFeeAmount: quote.serviceFeeAmount,
        platformCommissionAmount: quote.platformCommissionAmount,
        totalPrice: quote.totalPrice,
        currency: quote.currency,
      },
      rooms: quote.rooms,
      cancellationPolicy: quote.cancellationPolicy,
    };
  }

  toMinorUnits(amount, currency) {
    const zeroDecimalCurrencies = new Set([
      'BIF',
      'CLP',
      'DJF',
      'GNF',
      'JPY',
      'KMF',
      'KRW',
      'MGA',
      'PYG',
      'RWF',
      'UGX',
      'VUV',
      'XAF',
      'XOF',
      'XPF',
    ]);
    const parsed = parseFloat(amount || 0);
    return Math.round(
      parsed * (zeroDecimalCurrencies.has(String(currency).toUpperCase()) ? 1 : 100)
    );
  }
}

module.exports = new BookingService();
