const crypto = require('crypto');

const bookingRepository = require('@repositories/booking.repository');
const holdRepository = require('@repositories/hold.repository');
const idempotencyRepository = require('@repositories/idempotency.repository');
const transactionRepository = require('@repositories/transaction.repository');
const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');
const ledgerService = require('@services/ledger.service');
const inventoryService = require('@services/inventory.service');
const holdService = require('@services/hold.service');
const pricingService = require('@services/pricing.service');
const sequelize = require('@config/database.config');
const StripePaymentAdapter = require('@adapters/payment/stripePayment.adapter');
const { generateBookingCode } = require('@utils/booking.utils');

class BookingService {
  constructor() {
    this.paymentProvider = new StripePaymentAdapter();
  }

  formatHotelForLegacyClients(hotel) {
    if (!hotel) return null;

    const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;

    return {
      ...hotelData,
      city: hotelData.city?.name || hotelData.city || null,
      image_urls: hotelData.images || hotelData.image_urls || [],
    };
  }

  /**
   * Get all bookings for a user
   * Automatically updates booking status based on dates
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {boolean} options.includeCancelled - Include cancelled bookings (default: false)
   * @returns {Promise<Array>} Array of bookings with hotel and room information
   */
  async getUserBookings(userId, options = {}) {
    const { includeCancelled = false } = options;

    // Update booking statuses based on current date
    await bookingRepository.updateStatusByDates(userId);

    // Get bookings
    const bookings = await bookingRepository.findByBuyerId(userId, {
      excludeCancelled: !includeCancelled,
    });

    // Enrich with hotel and room information
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const bookingData = booking.toJSON ? booking.toJSON() : booking;

        // Get hotel information
        const hotel = await bookingRepository.findHotelById(bookingData.hotel_id);

        // Get room information
        const room = await bookingRepository.findRoomById(bookingData.room_id);

        return {
          ...bookingData,
          hotel: this.formatHotelForLegacyClients(hotel),
          room: room
            ? {
                room_id: room.id,
                room_name: room.room_name,
              }
            : null,
        };
      })
    );

    return enrichedBookings;
  }

  /**
   * Get a specific booking by ID
   * @param {number} bookingId - Booking ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} Booking details
   */
  async getBookingById(bookingId, userId) {
    const booking = await bookingRepository.findByIdAndBuyerId(bookingId, userId);

    if (!booking) {
      throw new ApiError(
        404,
        'BOOKING_NOT_FOUND',
        'Booking not found or you do not have permission to view it'
      );
    }

    // Get hotel and room information
    const hotel = await bookingRepository.findHotelById(booking.hotel_id);
    const room = await bookingRepository.findRoomById(booking.room_id);

    const bookingData = booking.toJSON ? booking.toJSON() : booking;

    return {
      ...bookingData,
      hotel: this.formatHotelForLegacyClients(hotel),
      room: room
        ? {
            room_id: room.id,
            room_name: room.room_name,
          }
        : null,
    };
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

  /**
   * Cancel a booking
   * @param {number} bookingId - Booking ID
   * @param {number} userId - User ID (for authorization)
   * @param {Object} options - Cancellation options
   * @param {boolean} options.processRefund - Process refund via Stripe (default: false)
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelBooking(bookingId, userId, options = {}) {
    const { processRefund = false } = options;

    // Find booking and verify ownership
    const booking = await bookingRepository.findCancellationContextByIdAndBuyerId(
      bookingId,
      userId
    );

    if (!booking) {
      throw new ApiError(
        404,
        'BOOKING_NOT_FOUND',
        'Booking not found or you do not have permission to cancel it'
      );
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      throw new ApiError(400, 'ALREADY_CANCELLED', 'Booking is already cancelled');
    }

    if (booking.status === 'completed') {
      throw new ApiError(400, 'CANNOT_CANCEL_COMPLETED', 'Cannot cancel a completed booking');
    }

    // Process refund if requested
    let refundResult = null;
    const cancellationPolicy = await this.evaluateCancellationPolicy(booking);

    if (processRefund) {
      if (cancellationPolicy.refundAmount > 0) {
        try {
          refundResult = await this.processRefund(booking, cancellationPolicy);
        } catch (error) {
          // Log error but don't fail cancellation
          logger.error('Refund processing failed:', error);
          // Continue with cancellation even if refund fails
        }
      }
    }

    // Update booking status to cancelled
    const [updatedCount] = await bookingRepository.updateStatus(bookingId, 'cancelled');

    if (updatedCount === 0) {
      throw new ApiError(500, 'UPDATE_FAILED', 'Failed to cancel booking');
    }

    return {
      bookingId,
      bookingCode: booking.booking_code,
      message: 'Booking cancelled successfully',
      refundProcessed: !!refundResult,
      cancellationPolicy,
      refund: refundResult,
    };
  }

  /**
   * Evaluate structured cancellation rule for a booking.
   * Room-specific rules override hotel-wide defaults.
   */
  async evaluateCancellationPolicy(booking) {
    const rule = await bookingRepository.findCancellationRule(booking.hotel_id, booking.room_id);
    const amount = parseFloat(booking.total_price);
    const currency = booking.currency || 'USD';

    if (!rule) {
      return {
        eligible: false,
        eligibility: 'manual_review',
        reason: 'no_structured_rule',
        refundAmount: 0,
        refundPercent: 0,
        currency,
        isRefundable: false,
        freeCancellationDeadline: null,
        isWithinFreeCancellationWindow: false,
      };
    }

    const ruleData = rule.toJSON ? rule.toJSON() : rule;

    if (!ruleData.is_refundable) {
      return {
        eligible: false,
        eligibility: 'ineligible',
        reason: 'non_refundable_rule',
        refundAmount: 0,
        refundPercent: 0,
        currency,
        isRefundable: false,
        ruleId: ruleData.id,
        freeCancellationDeadline: null,
        isWithinFreeCancellationWindow: false,
      };
    }

    const hotel = booking.hotel || {};
    const timezone = hotel.timezone || 'UTC';
    const checkInDateTime = this.getHotelCheckInDateTime(
      booking.check_in_date,
      hotel.check_in_time,
      timezone
    );
    const freeCancellationDeadline =
      ruleData.free_cancellation_until_hours_before_checkin === null ||
      ruleData.free_cancellation_until_hours_before_checkin === undefined
        ? null
        : new Date(
            checkInDateTime.getTime() -
              ruleData.free_cancellation_until_hours_before_checkin * 60 * 60 * 1000
          );
    const isWithinFreeCancellationWindow =
      freeCancellationDeadline === null || new Date() <= freeCancellationDeadline;
    const refundPercent = isWithinFreeCancellationWindow
      ? parseFloat(ruleData.refund_percent_before_deadline)
      : parseFloat(ruleData.refund_percent_after_deadline);
    const refundAmount = this.roundMoney((amount * refundPercent) / 100);

    return {
      eligible: refundAmount > 0,
      eligibility: refundAmount > 0 ? 'eligible' : 'ineligible',
      reason: isWithinFreeCancellationWindow ? 'free_cancellation' : 'customer_request',
      refundAmount,
      refundPercent,
      currency,
      isRefundable: true,
      ruleId: ruleData.id,
      freeCancellationDeadline,
      isWithinFreeCancellationWindow,
    };
  }

  /**
   * Process refund for a booking
   * @param {Object} booking - Booking object
   * @param {Object} cancellationPolicy - Evaluated cancellation policy
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(booking, cancellationPolicy) {
    // Find transaction
    const transaction = await bookingRepository.findTransactionByBookingId(booking.id);

    if (!transaction) {
      throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found for this booking');
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new ApiError(
        500,
        'STRIPE_NOT_CONFIGURED',
        'Stripe is not configured. Cannot process refund.'
      );
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const transactionAmount = parseFloat(transaction.amount);
    const amount = Math.min(cancellationPolicy.refundAmount, transactionAmount);
    const currency = transaction.currency || booking.currency || 'USD';

    if (!transaction.stripe_charge_id) {
      throw new ApiError(
        400,
        'MISSING_STRIPE_CHARGE',
        'Cannot process refund because the transaction has no Stripe charge ID.'
      );
    }

    const refundRecord = await bookingRepository.createRefund({
      bookingId: booking.id,
      transactionId: transaction.id,
      buyerId: booking.buyer_id,
      hotelId: booking.hotel_id,
      amount,
      currency,
      status: 'pending',
      reason: cancellationPolicy.reason,
      eligibility: cancellationPolicy.eligibility,
      freeCancellationDeadline: cancellationPolicy.freeCancellationDeadline,
      metadata: {
        booking_code: booking.booking_code,
        cancellation_rule_id: cancellationPolicy.ruleId,
        refund_percent: cancellationPolicy.refundPercent,
        is_within_free_cancellation_window: cancellationPolicy.isWithinFreeCancellationWindow,
        transaction_status: transaction.status,
        stripe_payment_intent_id: transaction.stripe_payment_intent_id,
        stripe_charge_id: transaction.stripe_charge_id,
      },
    });

    try {
      // Process refund via Stripe
      const refund = await stripe.refunds.create({
        charge: transaction.stripe_charge_id,
        amount: Math.round(amount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          booking_id: booking.id,
          booking_code: booking.booking_code,
          transaction_id: transaction.id,
          refund_record_id: refundRecord.id,
        },
      });

      const refundStatus = this.normalizeRefundStatus(refund.status);
      const processedAt = refundStatus === 'succeeded' ? new Date() : null;

      await bookingRepository.updateRefund(refundRecord.id, {
        providerRefundId: refund.id,
        status: refundStatus,
        processedAt,
        metadata: {
          ...(refundRecord.metadata || {}),
          stripe_refund_status: refund.status,
        },
      });

      await bookingRepository.updateTransactionRefundState(transaction.id, {
        status:
          refundStatus === 'succeeded'
            ? amount >= transactionAmount
              ? 'refunded'
              : 'partially_refunded'
            : 'processing',
        refundId: refund.id,
        completedAt: processedAt,
      });

      if (refundStatus === 'succeeded') {
        const refundLedgerData = refundRecord.toJSON ? refundRecord.toJSON() : refundRecord;
        await ledgerService.recordRefundSucceeded({
          refund: {
            ...refundLedgerData,
            provider_refund_id: refund.id,
            status: refundStatus,
            processed_at: processedAt,
          },
          transaction,
        });
      }

      return {
        refundId: refund.id,
        amount,
        currency,
        status: refund.status,
        refundRecordId: refundRecord.id,
      };
    } catch (error) {
      await bookingRepository.updateRefund(refundRecord.id, {
        status: 'failed',
        processedAt: new Date(),
        failureCode: error.code,
        failureMessage: error.message,
        metadata: {
          ...(refundRecord.metadata || {}),
          stripe_error_type: error.type,
        },
      });

      throw error;
    }
  }

  normalizeRefundStatus(status) {
    const statusMap = {
      succeeded: 'succeeded',
      pending: 'processing',
      requires_action: 'processing',
      failed: 'failed',
      canceled: 'cancelled',
    };

    return statusMap[status] || 'processing';
  }

  getHotelCheckInDateTime(checkInDate, checkInTime = '14:00:00', timezone = 'UTC') {
    const [year, month, day] = String(checkInDate).split('-').map(Number);
    const [hour, minute, second] = String(checkInTime || '14:00:00')
      .split(':')
      .map(Number);

    return this.getUtcDateFromZonedParts(
      {
        year,
        month,
        day,
        hour: hour || 0,
        minute: minute || 0,
        second: second || 0,
      },
      timezone
    );
  }

  getUtcDateFromZonedParts(parts, timezone) {
    let utcTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );

    for (let i = 0; i < 2; i++) {
      const offset = this.getTimezoneOffset(new Date(utcTime), timezone);
      utcTime =
        Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
        offset;
    }

    return new Date(utcTime);
  }

  getTimezoneOffset(date, timezone) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date).reduce((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = Number(part.value);
      }
      return acc;
    }, {});

    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour === 24 ? 0 : parts.hour,
      parts.minute,
      parts.second
    );

    return asUtc - date.getTime();
  }

  roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Get booking by booking code
   * @param {string} bookingCode - Booking code
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} Booking details
   */
  async getBookingByCode(bookingCode, userId) {
    const booking = await bookingRepository.findDetailedByBookingCodeAndBuyerId(
      bookingCode,
      userId
    );

    if (!booking) {
      throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    return booking.toJSON ? booking.toJSON() : booking;
  }

  hashRequest(data) {
    return crypto
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
