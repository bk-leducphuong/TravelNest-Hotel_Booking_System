const ApiError = require('@utils/ApiError');
const sequelize = require('@config/database.config');
const { auditService } = require('@platform/audit');
const { publish, DOMAIN_EVENTS } = require('@platform/events');
const inventoryModule = require('@modules/inventory');
const catalog = require('@modules/catalog');
const identity = require('@modules/identity');

const bookingRepository = require('../../infrastructure/booking.repository');
const bookingAdminRepository = require('../../infrastructure/booking-admin.repository');
const pricingService = require('../pricing.service');
const { generateBookingCode } = require('../../domain/booking-code');

const roundMoney = (value) => Math.round(parseFloat(value || 0) * 100) / 100;

/**
 * Create a booking on behalf of a guest (phone / walk-in).
 *
 * The guest must already have an account: pass `buyerId` or `guestEmail`.
 * Reserves inventory, prices the stay (with an optional manual total override)
 * and creates the booking as `confirmed` (payment is handled out of band).
 */
async function createManualBooking(hotelId, payload = {}, { actorUserId, requestId } = {}) {
  const {
    roomId,
    checkInDate,
    checkOutDate,
    quantity = 1,
    numberOfGuests = 1,
    buyerId,
    guestEmail,
    specialRequests,
    guestDetails,
    totalPrice,
  } = payload;

  const room = await catalog.getRoomForHotel(roomId, hotelId);
  if (!room) {
    throw new ApiError(400, 'ROOM_NOT_IN_HOTEL', 'Room does not belong to this hotel');
  }

  let buyer = null;
  if (buyerId) {
    buyer = { id: buyerId };
  } else if (guestEmail) {
    buyer = await identity.findUserByEmail(guestEmail);
  }
  if (!buyer) {
    throw new ApiError(
      404,
      'BUYER_NOT_FOUND',
      'No account exists for the guest. Provide an existing buyerId or guestEmail.'
    );
  }

  const available = await inventoryModule.checkAvailability({
    roomIds: [roomId],
    checkInDate,
    checkOutDate,
    quantity,
  });
  if (!available) {
    throw new ApiError(409, 'ROOM_NOT_AVAILABLE', 'The room is not available for those dates.');
  }

  const quote = await pricingService.quote({
    hotelId,
    rooms: [{ roomId, quantity }],
    checkInDate,
    checkOutDate,
  });

  const hasOverride = totalPrice !== undefined && totalPrice !== null;
  const finalTotal = hasOverride ? roundMoney(totalPrice) : quote.totalPrice;

  let bookingId;
  await sequelize.transaction(async (transaction) => {
    await inventoryModule.reserveRooms(
      {
        bookedRooms: [{ room_id: roomId, roomQuantity: quantity }],
        checkInDate,
        checkOutDate,
      },
      { transaction }
    );

    const booking = await bookingRepository.create(
      {
        buyer_id: buyer.id,
        hotel_id: hotelId,
        room_id: roomId,
        booking_code: generateBookingCode(),
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        number_of_guests: numberOfGuests,
        quantity,
        subtotal: quote.subtotal,
        tax_amount: quote.taxAmount,
        service_fee_amount: quote.serviceFeeAmount,
        platform_commission_amount: quote.platformCommissionAmount,
        total_price: finalTotal,
        currency: quote.currency,
        status: 'confirmed',
        special_requests: specialRequests || null,
        guest_details: guestDetails || null,
        price_breakdown: { ...quote, manual: true, overrideTotalPrice: hasOverride },
        cancellation_policy_snapshot: quote.cancellationPolicy,
        confirmed_at: new Date(),
      },
      { transaction }
    );

    await bookingRepository.bulkCreateBookingRooms(
      quote.rooms.map((roomQuote) => ({
        bookingId: booking.id,
        roomId: roomQuote.roomId,
        quantity: roomQuote.quantity,
        nightlyPriceSnapshot: roomQuote.nightly,
        subtotal: roomQuote.subtotal,
        totalPrice: roomQuote.totalPrice,
      })),
      { transaction }
    );

    bookingId = booking.id;
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'booking.created_manual',
    entityType: 'booking',
    entityId: bookingId,
    hotelId,
    after: {
      roomId,
      checkInDate,
      checkOutDate,
      quantity,
      buyerId: buyer.id,
      totalPrice: finalTotal,
    },
    requestId,
  });

  await publish(DOMAIN_EVENTS.BOOKING_CREATED, { bookingId, hotelId, source: 'admin' });

  const booking = await bookingAdminRepository.findByIdWithRelations(bookingId);
  return { booking };
}

module.exports = { createManualBooking };
