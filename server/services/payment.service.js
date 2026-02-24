const paymentRepository = require('@repositories/payment.repository');
const bookingRepository = require('@repositories/booking.repository');
const transactionRepository = require('@repositories/transaction.repository');
const holdRepository = require('@repositories/hold.repository');
const holdService = require('@services/hold.service');
const inventoryService = require('@services/inventory.service');
const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');
const StripePaymentAdapter = require('@adapters/payment/stripePayment.adapter');
const sequelize = require('@config/database.config');
const { generateBookingCode } = require('@utils/booking.utils');

class PaymentService {
  constructor() {
    // Default to Stripe, but can be swapped with PayPal, etc.
    this.paymentProvider = new StripePaymentAdapter();
  }

  /**
   * Set payment provider (for testing or switching providers)
   */
  setPaymentProvider(provider) {
    this.paymentProvider = provider;
  }

  /**
   * Create a payment intent based on the user's current active hold.
   * Flow:
   * - Find active hold for user (with rooms)
   * - Within a DB transaction:
   *   - Release held rooms and reserve them for booking
   *   - Mark hold as completed
   *   - Create pending booking records linked to the hold
   *   - Create payment intent using hold total price and booking details
   */
  async createPaymentIntent(userId, paymentData) {
    const { paymentMethodId, currency } = paymentData;

    if (!paymentMethodId) {
      throw new ApiError(400, 'MISSING_REQUIRED_FIELDS', 'paymentMethodId is required');
    }

    // 1. Find active hold for user
    const activeHolds = await holdRepository.findActiveByUserId(userId);

    if (!activeHolds || activeHolds.length === 0) {
      throw new ApiError(
        400,
        'NO_ACTIVE_HOLD',
        'No active hold found for this user. Please create a hold before starting payment.'
      );
    }

    const hold = activeHolds[0];
    const holdData = hold.toJSON ? hold.toJSON() : hold;

    if (new Date(holdData.expires_at) <= new Date()) {
      throw new ApiError(
        400,
        'HOLD_EXPIRED',
        'Your room hold has expired. Please start a new booking.'
      );
    }

    const rooms =
      (holdData.holdRooms || hold.holdRooms || []).map((hr) => ({
        roomId: hr.room_id,
        quantity: hr.quantity,
      })) || [];

    if (rooms.length === 0) {
      throw new ApiError(400, 'HOLD_HAS_NO_ROOMS', 'Active hold does not contain any rooms.');
    }

    const bookingCode = generateBookingCode();
    const holdCurrency = (holdData.currency || currency || 'USD').toUpperCase();
    const amount = parseFloat(holdData.total_price);

    if (!amount || amount <= 0) {
      throw new ApiError(400, 'INVALID_HOLD_AMOUNT', 'Hold total price is invalid.');
    }

    const transaction = await sequelize.transaction();

    try {
      const checkInDate = holdData.check_in_date;
      const checkOutDate = holdData.check_out_date;
      const numberOfGuests = holdData.number_of_guests;

      // 2. Release hold (held rooms + hold status) using hold service, inside this transaction
      await holdService.releaseHold(holdData.id, userId, 'completed', {
        transaction,
      });

      const bookedRooms = rooms.map((r) => ({
        room_id: r.roomId,
        roomQuantity: r.quantity,
      }));

      // 3. Reserve rooms for the booking
      await inventoryService.reserveRooms(
        {
          bookedRooms,
          checkInDate,
          checkOutDate,
        },
        { transaction }
      );

      // 4. Create pending bookings linked to this hold
      for (const room of rooms) {
        await bookingRepository.create(
          {
            buyer_id: userId,
            hotel_id: holdData.hotel_id,
            room_id: room.roomId,
            hold_id: holdData.id,
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            total_price: amount,
            currency: holdCurrency,
            status: 'pending',
            number_of_guests: numberOfGuests,
            quantity: room.quantity,
            booking_code: bookingCode,
          },
          { transaction }
        );
      }

      // 5. Create payment intent through adapter
      const payment = await this.paymentProvider.createPayment({
        amount,
        currency: holdCurrency,
        paymentMethodId,
        returnUrl: process.env.CLIENT_HOST
          ? `${process.env.CLIENT_HOST}/book/complete`
          : 'http://localhost:5173/book/complete',
        metadata: {
          booking_code: bookingCode,
          hotel_id: holdData.hotel_id.toString(),
          buyer_id: userId.toString(),
          booked_rooms: JSON.stringify(bookedRooms),
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          number_of_guests: numberOfGuests.toString(),
        },
      });

      await transaction.commit();

      logger.info('Payment intent created from hold', {
        paymentId: payment.id,
        userId,
        holdId: holdData.id,
        bookingCode,
        amount,
        provider: payment.provider,
      });

      return {
        clientSecret: payment.clientSecret,
        paymentIntentId: payment.id,
        status: payment.status,
        bookingCode,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to create payment intent from hold:', error);
      throw new ApiError(
        error.statusCode || 500,
        error.code || 'PAYMENT_CREATION_FAILED',
        error.message
      );
    }
  }

  /**
   * Handle payment succeeded event
   * Idempotent - can be called multiple times safely
   */
  async handlePaymentSucceeded(context) {
    const { paymentIntentId, bookingCode, hotelId, buyerId, amount, currency } = context;

    logger.info('Processing payment succeeded', {
      paymentIntentId,
      bookingCode,
    });

    // Use database transaction for atomicity
    const transaction = await sequelize.transaction();

    try {
      // 1. Check if transaction already exists (idempotency)
      let dbTransaction = await transactionRepository.findByPaymentIntentId(paymentIntentId, {
        transaction,
      });

      if (dbTransaction && dbTransaction.status === 'completed') {
        logger.info('Payment already processed (idempotent)', {
          paymentIntentId,
        });
        await transaction.commit();
        return { success: true, alreadyProcessed: true };
      }

      // 2. Create or update transaction
      if (!dbTransaction) {
        dbTransaction = await transactionRepository.create(
          {
            buyer_id: buyerId,
            hotel_id: hotelId,
            amount,
            currency: currency.toUpperCase(),
            status: 'completed',
            transaction_type: 'booking_payment',
            payment_intent_id: paymentIntentId,
            charge_id: context.chargeId,
            booking_code: bookingCode,
          },
          { transaction }
        );
      } else {
        // Update existing transaction
        await transactionRepository.update(
          dbTransaction.id,
          {
            status: 'completed',
            charge_id: context.chargeId,
            booking_code: bookingCode,
          },
          { transaction }
        );
      }

      // 3. Create or update payment record
      const existingPayment = await paymentRepository.findByTransactionId(dbTransaction.id, {
        transaction,
      });

      if (!existingPayment) {
        await paymentRepository.create(
          {
            transaction_id: dbTransaction.id,
            amount,
            currency: currency.toUpperCase(),
            payment_method: context.paymentMethod || 'card',
            payment_status: 'succeeded',
            stripe_payment_method_id: context.paymentMethodId,
            card_brand: context.cardBrand,
            card_last4: context.cardLast4,
            card_exp_month: context.cardExpMonth,
            card_exp_year: context.cardExpYear,
            paid_at: new Date(),
            metadata: {
              payment_intent_id: paymentIntentId,
              charge_id: context.chargeId,
            },
          },
          { transaction }
        );
      } else {
        await paymentRepository.update(
          existingPayment.id,
          {
            payment_status: 'succeeded',
            payment_method: context.paymentMethod || 'card',
            stripe_payment_method_id: context.paymentMethodId,
            card_brand: context.cardBrand,
            card_last4: context.cardLast4,
            paid_at: new Date(),
          },
          { transaction }
        );
      }

      // 4. Create bookings (if not already created) and reserve room inventory in same transaction
      const existingBookings = await bookingRepository.findAllByBookingCode(bookingCode, {
        transaction,
      });

      if (existingBookings.length === 0) {
        const { bookedRooms, checkInDate, checkOutDate, numberOfGuests } = context;

        for (const room of bookedRooms) {
          await bookingRepository.create(
            {
              buyer_id: buyerId,
              hotel_id: hotelId,
              room_id: room.room_id,
              check_in_date: checkInDate,
              check_out_date: checkOutDate,
              total_price: amount,
              status: 'confirmed',
              number_of_guests: numberOfGuests,
              quantity: room.roomQuantity,
              booking_code: bookingCode,
            },
            { transaction }
          );
        }
      } else {
        // Update existing pending bookings to confirmed
        await bookingRepository.updateByBookingCode(
          bookingCode,
          { status: 'confirmed' },
          { transaction }
        );
      }

      // 5. Create invoice (will be done separately or here)
      // ... invoice creation logic

      await transaction.commit();

      logger.info('Payment succeeded processed successfully', {
        paymentIntentId,
        bookingCode,
      });

      return {
        success: true,
        transactionId: dbTransaction.id,
        bookingCode,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error processing payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle payment failed event
   * Idempotent
   */
  async handlePaymentFailed(context) {
    const { paymentIntentId, buyerId, hotelId, amount, currency, failureCode, failureMessage } =
      context;

    logger.info('Processing payment failed', { paymentIntentId });

    try {
      // Check if already recorded
      const existing = await transactionRepository.findByPaymentIntentId(paymentIntentId);

      if (existing && existing.status === 'failed') {
        logger.info('Payment failure already recorded (idempotent)', {
          paymentIntentId,
        });
        return { success: true, alreadyProcessed: true };
      }

      if (!existing) {
        // Create failed transaction record
        const transaction = await transactionRepository.create({
          buyer_id: buyerId,
          hotel_id: hotelId,
          amount,
          currency: currency.toUpperCase(),
          status: 'failed',
          transaction_type: 'booking_payment',
          payment_intent_id: paymentIntentId,
        });

        // Create failed payment record
        await paymentRepository.create({
          transaction_id: transaction.id,
          amount,
          currency: currency.toUpperCase(),
          payment_method: context.paymentMethod || 'unknown',
          payment_status: 'failed',
          failure_code: failureCode,
          failure_message: failureMessage,
          paid_at: new Date(),
        });
      } else {
        // Update existing to failed
        await transactionRepository.update(existing.id, {
          status: 'failed',
        });
      }

      logger.info('Payment failed processed successfully', { paymentIntentId });

      return { success: true };
    } catch (error) {
      logger.error('Error processing payment failed:', error);
      throw error;
    }
  }

  /**
   * Handle refund succeeded event
   * Idempotent
   */
  async handleRefundSucceeded(context) {
    const {
      chargeId,
      refundId,
      refundAmount,
      bookingCode,
      bookedRooms,
      checkInDate,
      checkOutDate,
    } = context;

    logger.info('Processing refund succeeded', {
      chargeId,
      refundId,
      bookingCode,
    });

    const transaction = await sequelize.transaction();

    try {
      // Find transaction by charge ID
      const dbTransaction = await transactionRepository.findByChargeId(chargeId, {
        transaction,
      });

      if (!dbTransaction) {
        throw new Error(`Transaction not found for charge: ${chargeId}`);
      }

      // Update booking status to cancelled
      await bookingRepository.updateByBookingCode(
        bookingCode,
        { status: 'cancelled' },
        { transaction }
      );

      // Release room inventory atomically with refund
      if (
        bookedRooms &&
        Array.isArray(bookedRooms) &&
        bookedRooms.length > 0 &&
        checkInDate &&
        checkOutDate
      ) {
        await inventoryService.releaseRooms(
          {
            bookedRooms,
            checkInDate,
            checkOutDate,
          },
          { transaction }
        );
      }

      await transaction.commit();

      logger.info('Refund succeeded processed successfully', {
        refundId,
        bookingCode,
      });

      return { success: true };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error processing refund succeeded:', error);
      throw error;
    }
  }

  /**
   * Get payment by booking ID
   */
  async getPaymentByBookingId(bookingId, userId) {
    const payment = await paymentRepository.findPaymentByBookingId(bookingId);

    if (!payment) {
      throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
    }

    // Verify authorization
    if (payment.buyer_id !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to view this payment');
    }

    return payment;
  }

  /**
   * Get user payments with pagination
   */
  async getUserPayments(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const validatedLimit = Math.min(limit, 100);
    const offset = (page - 1) * validatedLimit;

    const result = await paymentRepository.findPaymentsByBuyerId(userId, {
      limit: validatedLimit,
      offset,
    });

    return {
      payments: result.rows,
      page,
      limit: validatedLimit,
      total: result.count,
    };
  }
}

module.exports = new PaymentService();
