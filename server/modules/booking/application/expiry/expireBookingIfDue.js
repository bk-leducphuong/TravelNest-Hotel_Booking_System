const { Transaction } = require('sequelize');

const logger = require('@config/logger.config');
const sequelize = require('@config/database.config');
const bookingRepository = require('@repositories/booking.repository');
const transactionRepository = require('@repositories/transaction.repository');
const inventoryModule = require('@modules/inventory');

const { cancelExpiredPaymentIntent } = require('./cancelExpiredPaymentIntent');

/**
 * Expire a single booking if it is still pending past its expiry. Uses an
 * explicit transaction with a row lock so concurrent scanners cannot double
 * release inventory.
 *
 * @param {number|string} bookingId
 * @returns {Promise<object|null>} expiry summary, or null if nothing to do
 */
async function expireBookingIfDue(bookingId) {
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
      await inventoryModule.releaseRooms(
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
      await cancelExpiredPaymentIntent(dbTransaction.stripe_payment_intent_id, bookingId);
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

module.exports = { expireBookingIfDue };
