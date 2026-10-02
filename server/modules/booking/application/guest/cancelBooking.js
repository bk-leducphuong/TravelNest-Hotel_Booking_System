const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');
const sequelize = require('@config/database.config');

const inventoryModule = require('@modules/inventory');
const bookingRepository = require('../../infrastructure/booking.repository');

const { evaluateBookingCancellationPolicy } = require('./evaluateCancellationPolicy');

function resolveReleaseRooms(booking) {
  const data = booking.toJSON ? booking.toJSON() : booking;

  if (Array.isArray(data.bookingRooms) && data.bookingRooms.length > 0) {
    return data.bookingRooms.map((room) => ({
      room_id: room.room_id,
      roomQuantity: room.quantity || 1,
    }));
  }

  if (data.room_id) {
    return [{ room_id: data.room_id, roomQuantity: data.quantity || 1 }];
  }

  return [];
}

/**
 * Map the Payment module's refund result onto the legacy guest response shape
 * until the clients are migrated.
 */
function toLegacyRefund(result) {
  if (!result) return null;

  return {
    refundId: result.providerRefundId,
    amount: result.amount,
    currency: result.currency,
    status: result.status,
    refundRecordId: result.refundId,
  };
}

/**
 * Best-effort refund for a cancelled booking. Refunds are owned by the Payment
 * module; a refund failure must never block the cancellation itself.
 */
async function refundCancelledBooking(bookingId, userId, cancellationPolicy) {
  try {
    const transaction = await bookingRepository.findTransactionByBookingId(bookingId);
    const transactionAmount = parseFloat(transaction?.amount || 0);
    const amount = Math.min(cancellationPolicy.refundAmount, transactionAmount);

    if (!(amount > 0)) {
      return null;
    }

    // Lazy: payment imports the booking module, so requiring it at load time
    // would be a cycle.
    const paymentModule = require('@modules/payment');
    const result = await paymentModule.refundBooking(bookingId, {
      reason: cancellationPolicy.reason,
      amount,
      actorUserId: userId,
    });

    return toLegacyRefund(result);
  } catch (error) {
    // Log but don't fail cancellation: the booking is still released.
    logger.error('Refund processing failed:', error);
    return null;
  }
}

/**
 * Cancel a booking owned by the buyer, releasing inventory and (optionally)
 * refunding the attached payment transaction.
 *
 * Refunds are delegated to the Payment module; inventory release + status
 * change is one transaction.
 *
 * @param {number|string} bookingId
 * @param {number} userId
 * @param {{ processRefund?: boolean }} options
 * @returns {Promise<object>} cancellation result
 */
async function cancelBooking(bookingId, userId, options = {}) {
  const { processRefund = false } = options;

  const booking = await bookingRepository.findCancellationContextByIdAndBuyerId(bookingId, userId);

  if (!booking) {
    throw new ApiError(
      404,
      'BOOKING_NOT_FOUND',
      'Booking not found or you do not have permission to cancel it'
    );
  }

  const bookingData = booking.toJSON ? booking.toJSON() : booking;

  if (bookingData.status === 'cancelled') {
    throw new ApiError(400, 'ALREADY_CANCELLED', 'Booking is already cancelled');
  }

  if (bookingData.status === 'completed') {
    throw new ApiError(400, 'CANNOT_CANCEL_COMPLETED', 'Cannot cancel a completed booking');
  }

  const cancellationPolicy = await evaluateBookingCancellationPolicy(booking);

  let refund = null;
  if (processRefund && cancellationPolicy.refundAmount > 0) {
    refund = await refundCancelledBooking(bookingId, userId, cancellationPolicy);
  }

  const releaseRooms = resolveReleaseRooms(booking);

  // Release inventory and cancel atomically so cancelled bookings don't leave
  // phantom reserved rooms behind.
  await sequelize.transaction(async (transaction) => {
    if (releaseRooms.length > 0) {
      await inventoryModule.releaseRooms(
        {
          bookedRooms: releaseRooms,
          checkInDate: bookingData.check_in_date,
          checkOutDate: bookingData.check_out_date,
        },
        { transaction }
      );
    }

    const [updatedCount] = await bookingRepository.updateStatus(bookingId, 'cancelled', {
      transaction,
    });

    if (updatedCount === 0) {
      throw new ApiError(500, 'UPDATE_FAILED', 'Failed to cancel booking');
    }
  });

  return {
    bookingId,
    bookingCode: bookingData.booking_code,
    message: 'Booking cancelled successfully',
    refundProcessed: !!refund,
    cancellationPolicy,
    refund,
  };
}

module.exports = { cancelBooking };
