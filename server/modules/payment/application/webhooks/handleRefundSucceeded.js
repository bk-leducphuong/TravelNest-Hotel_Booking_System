const logger = require('@config/logger.config');
const sequelize = require('@config/database.config');
const bookingModule = require('@modules/booking');
const ledgerService = require('@services/ledger.service');
const inventoryModule = require('@modules/inventory');
const transactionRepository = require('../../infrastructure/transaction.repository');

const refundRepository = require('../../infrastructure/refund.repository');

const { fromMinorUnits } = require('../../domain/money');

/**
 * Handle a `charge.refunded` webhook. Idempotent: refunds initiated through the
 * admin API are recorded as succeeded before Stripe's webhook arrives, so this
 * must never process the same refund twice.
 */
async function handleRefundSucceeded(context) {
  const {
    chargeId,
    refundId,
    refundAmount,
    currency,
    bookingCode,
    bookedRooms,
    checkInDate,
    checkOutDate,
  } = context;

  logger.info('Processing refund succeeded', { chargeId, refundId, bookingCode });

  const transaction = await sequelize.transaction();

  try {
    const dbTransaction = await transactionRepository.findByChargeId(chargeId, { transaction });

    if (!dbTransaction) {
      throw new Error(`Transaction not found for charge: ${chargeId}`);
    }

    const refundCurrency = currency || dbTransaction.currency || 'USD';
    const amount = fromMinorUnits(refundAmount, refundCurrency);

    let refundRecord = await refundRepository.findByProviderRefundId(refundId, {
      transaction,
    });

    if (refundRecord && refundRecord.status === 'succeeded') {
      await transaction.commit();
      logger.info('Refund already processed (idempotent)', { refundId });
      return { success: true, alreadyProcessed: true };
    }

    if (!refundRecord) {
      // Refund created outside the app (e.g. Stripe dashboard).
      refundRecord = await refundRepository.create(
        {
          bookingId: dbTransaction.booking_id,
          transactionId: dbTransaction.id,
          buyerId: dbTransaction.buyer_id,
          hotelId: dbTransaction.hotel_id,
          providerRefundId: refundId,
          amount,
          currency: refundCurrency,
          status: 'succeeded',
          reason: 'customer_request',
          eligibility: 'eligible',
          processedAt: new Date(),
          metadata: { source: 'stripe_webhook', booking_code: bookingCode },
        },
        { transaction }
      );
    } else {
      await refundRepository.update(
        refundRecord.id,
        {
          status: 'succeeded',
          processedAt: new Date(),
          failureCode: null,
          failureMessage: null,
        },
        { transaction }
      );
    }

    const totalRefunded = await refundRepository.sumSucceededForTransaction(dbTransaction.id, {
      transaction,
    });
    const isFullRefund = totalRefunded >= parseFloat(dbTransaction.amount) - 0.01;

    await transactionRepository.update(
      dbTransaction.id,
      { status: isFullRefund ? 'refunded' : 'partially_refunded' },
      { transaction }
    );

    // Only a full refund cancels the stay and releases inventory. Partial
    // refunds are financial adjustments and must not cancel the booking.
    if (isFullRefund) {
      // Skip if the booking was already cancelled (e.g. an admin force-cancel
      // already released inventory) to avoid a double release.
      const existingBooking = bookingCode
        ? await bookingModule.findBookingByCode(bookingCode, { transaction })
        : null;
      const alreadyCancelled =
        existingBooking && ['cancelled', 'expired'].includes(existingBooking.status);

      if (!alreadyCancelled) {
        await bookingModule.updateBookingsByCode(
          bookingCode,
          { status: 'cancelled' },
          { transaction }
        );

        if (
          bookedRooms &&
          Array.isArray(bookedRooms) &&
          bookedRooms.length > 0 &&
          checkInDate &&
          checkOutDate
        ) {
          await inventoryModule.releaseRooms(
            { bookedRooms, checkInDate, checkOutDate },
            { transaction }
          );
        }
      }
    }

    const refundData = refundRecord.toJSON ? refundRecord.toJSON() : refundRecord;
    await ledgerService.recordRefundSucceeded(
      {
        refund: {
          ...refundData,
          amount,
          currency: refundCurrency,
          status: 'succeeded',
          provider_refund_id: refundId,
          processed_at: refundData.processed_at || new Date(),
        },
        transaction: dbTransaction.toJSON ? dbTransaction.toJSON() : dbTransaction,
      },
      { transaction }
    );

    await transaction.commit();

    logger.info('Refund succeeded processed successfully', {
      refundId,
      bookingCode,
      fullRefund: isFullRefund,
    });

    return {
      success: true,
      refundId: refundRecord.id,
      fullRefund: isFullRefund,
      alreadyProcessed: false,
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error processing refund succeeded:', error);
    throw error;
  }
}

module.exports = { handleRefundSucceeded };
