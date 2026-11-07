const { Transaction } = require('sequelize');

const logger = require('@config/logger.config');
const sequelize = require('@config/database.config');
const bookingModule = require('@modules/booking');
const ledgerService = require('../ledger.service');

const transactionRepository = require('../../infrastructure/transaction.repository');
const paymentRepository = require('../../infrastructure/payment.repository');

const { fromMinorUnits } = require('../../domain/money');
const { createObligation } = require('../refund-obligations');

/**
 * Handle a `payment_intent.succeeded` webhook. Idempotent: safe to call more
 * than once for the same payment intent.
 */
async function handlePaymentSucceeded(context) {
  const { paymentIntentId, bookingCode, bookingId, transactionId, hotelId, buyerId, currency } =
    context;
  const amount = fromMinorUnits(context.amount, currency);

  logger.info('Processing payment succeeded', { paymentIntentId, bookingCode });

  const transaction = await sequelize.transaction();

  try {
    const existingBookings = bookingCode
      ? await bookingModule.getBookingsByCode(bookingCode, {
          transaction,
          lock: Transaction.LOCK.UPDATE,
        })
      : [];
    let primaryBooking = existingBookings[0];

    // 1. Check if transaction already exists (idempotency)
    let dbTransaction = transactionId
      ? await transactionRepository.findById(transactionId, {
          transaction,
          lock: Transaction.LOCK.UPDATE,
        })
      : null;

    if (!dbTransaction) {
      dbTransaction = await transactionRepository.findByPaymentIntentId(paymentIntentId, {
        transaction,
      });
    }

    if (
      dbTransaction &&
      ['completed', 'partially_refunded', 'refunded'].includes(dbTransaction.status)
    ) {
      logger.info('Payment already processed (idempotent)', { paymentIntentId });
      await transaction.commit();
      return { success: true, alreadyProcessed: true };
    }

    // 2. Create or update transaction
    if (!dbTransaction) {
      dbTransaction = await transactionRepository.create(
        {
          bookingId: bookingId || primaryBooking?.id,
          buyerId,
          hotelId,
          amount,
          currency: currency.toUpperCase(),
          status: 'completed',
          transactionType: 'payment',
          paymentIntentId,
          chargeId: context.chargeId,
          metadata: {
            booking_code: bookingCode,
          },
        },
        { transaction }
      );
    } else {
      await transactionRepository.update(
        dbTransaction.id,
        {
          status: 'completed',
          chargeId: context.chargeId,
          completedAt: new Date(),
          metadata: {
            ...(dbTransaction.metadata || {}),
            booking_code: bookingCode,
          },
        },
        { transaction }
      );
      dbTransaction = {
        ...(dbTransaction.toJSON ? dbTransaction.toJSON() : dbTransaction),
        status: 'completed',
        stripe_charge_id: context.chargeId,
        stripe_payment_intent_id: paymentIntentId,
        completed_at: new Date(),
      };
    }

    // 3. Create or update payment record
    const existingPayment = await paymentRepository.findByTransactionId(dbTransaction.id, {
      transaction,
    });

    let ledgerPayment = existingPayment;

    if (!existingPayment) {
      ledgerPayment = await paymentRepository.create(
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

    if (
      existingBookings.some((booking) =>
        ['expired', 'cancelled', 'no_show', 'completed'].includes(booking.status)
      )
    ) {
      await ledgerService.recordPaymentSucceeded(
        { transaction: dbTransaction, payment: ledgerPayment, booking: primaryBooking },
        { transaction }
      );
      const refund = await createObligation(
        dbTransaction,
        {
          amount,
          reason: 'other',
          key: `late-payment-${dbTransaction.id}`,
          source: 'late_payment_compensation',
        },
        { transaction }
      );
      if (primaryBooking?.status === 'cancelled') {
        await bookingModule.updateBookingsByCode(
          bookingCode,
          {
            cancellation_decision: {
              ...(primaryBooking.cancellation_decision || {}),
              refundId: refund.refundId,
              outcome: 'refund_required',
              approvedRefundAmount: amount,
              reason: 'payment_received_after_cancellation',
              decidedAt: new Date().toISOString(),
            },
          },
          { transaction }
        );
      }
      await transaction.commit();
      return { success: true, terminalBooking: true, refund };
    }

    // 4. Confirm bookings. The new flow creates pending-payment bookings before payment.
    if (existingBookings.length === 0) {
      const { bookedRooms, checkInDate, checkOutDate, numberOfGuests } = context;

      if (bookedRooms && bookedRooms.length > 0 && bookingCode) {
        for (const room of bookedRooms) {
          const createdBooking = await bookingModule.createBooking(
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
              confirmed_at: new Date(),
            },
            { transaction }
          );

          if (!primaryBooking) {
            primaryBooking = createdBooking;
          }
        }
      }
    } else {
      await bookingModule.updateBookingsByCode(
        bookingCode,
        { status: 'confirmed', confirmed_at: new Date() },
        { transaction }
      );
      primaryBooking = {
        ...(primaryBooking.toJSON ? primaryBooking.toJSON() : primaryBooking),
        status: 'confirmed',
        confirmed_at: new Date(),
      };
    }

    await ledgerService.recordPaymentSucceeded(
      {
        transaction: dbTransaction,
        payment: ledgerPayment,
        booking: primaryBooking,
      },
      { transaction }
    );

    await transaction.commit();

    logger.info('Payment succeeded processed successfully', { paymentIntentId, bookingCode });

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

module.exports = { handlePaymentSucceeded };
