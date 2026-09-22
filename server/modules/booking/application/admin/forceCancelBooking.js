const ApiError = require('@utils/ApiError');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const { auditService } = require('@platform/audit');
const sequelize = require('@config/database.config');

const inventoryModule = require('@modules/inventory');
const paymentModule = require('@modules/payment');

const bookingRepository = require('../../infrastructure/booking-admin.repository');
const {
  BOOKING_STATUS,
  assertTransition,
  requiresInventoryRelease,
} = require('../../domain/booking-status');

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
 * Admin force-cancel: releases held/reserved inventory and cancels the booking,
 * optionally refunding the attached payment transaction.
 *
 * Inventory release and the status change are one transaction; the refund is a
 * separate cross-module call and its failure is reported, not silently dropped.
 */
async function forceCancelBooking(
  bookingId,
  { reason, processRefund = false, refundAmount, actorUserId, requestId } = {}
) {
  const booking = await bookingRepository.findByIdWithRelations(bookingId);

  if (!booking) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  const bookingData = booking.toJSON ? booking.toJSON() : booking;
  const previousStatus = bookingData.status;

  if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.EXPIRED].includes(previousStatus)) {
    throw new ApiError(409, 'BOOKING_ALREADY_CANCELLED', 'Booking is already cancelled or expired');
  }
  if (previousStatus === BOOKING_STATUS.COMPLETED) {
    throw new ApiError(409, 'CANNOT_CANCEL_COMPLETED', 'Cannot cancel a completed booking');
  }

  assertTransition(previousStatus, BOOKING_STATUS.CANCELLED);

  const releaseRooms = resolveReleaseRooms(booking);

  await sequelize.transaction(async (transaction) => {
    if (releaseRooms.length > 0 && requiresInventoryRelease(previousStatus)) {
      await inventoryModule.releaseRooms(
        {
          bookedRooms: releaseRooms,
          checkInDate: bookingData.check_in_date,
          checkOutDate: bookingData.check_out_date,
        },
        { transaction }
      );
    }

    await bookingRepository.update(
      bookingId,
      { status: BOOKING_STATUS.CANCELLED, cancelled_at: new Date() },
      { transaction }
    );
  });

  let refund = null;
  let refundError = null;

  if (processRefund) {
    try {
      refund = await paymentModule.refundBooking(bookingId, {
        reason: 'hotel_cancelled',
        amount: refundAmount,
        actorUserId,
        requestId,
      });
    } catch (error) {
      refundError = error.message;
    }
  }

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'booking.force_cancelled',
    entityType: 'booking',
    entityId: bookingId,
    hotelId: bookingData.hotel_id,
    before: { status: previousStatus },
    after: { status: BOOKING_STATUS.CANCELLED, refunded: Boolean(refund), refundError },
    reason,
    requestId,
  });

  await eventBus.publish(DOMAIN_EVENTS.BOOKING_CANCELLED, {
    bookingId,
    hotelId: bookingData.hotel_id,
    buyerId: bookingData.buyer_id,
    reason,
    refunded: Boolean(refund),
  });

  return {
    bookingId,
    previousStatus,
    status: BOOKING_STATUS.CANCELLED,
    inventoryReleased: releaseRooms.length > 0,
    refund,
    refundError,
  };
}

module.exports = { forceCancelBooking };
