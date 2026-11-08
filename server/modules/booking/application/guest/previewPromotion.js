const ApiError = require('@utils/ApiError');

const holdRepository = require('../../infrastructure/hold.repository');
const pricingService = require('../pricing.service');

/**
 * Preview the best automatic offer plus an optional promo code for a hold.
 *
 * Reads rooms and dates from the hold; client-provided monetary amounts are
 * ignored. Does not consume any promotion usage.
 *
 * @param {number|string} userId
 * @param {{ holdId: string, code?: string|null }} data
 * @returns {Promise<object>}
 */
async function previewPromotion(userId, data = {}) {
  const hold = await holdRepository.findByIdWithRooms(data.holdId);

  if (!hold) {
    throw new ApiError(404, 'HOLD_NOT_FOUND', 'Hold not found');
  }
  if (String(hold.user_id) !== String(userId)) {
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
    promotionCode: data.code || null,
    buyerId: userId,
  });

  return {
    holdId: hold.id,
    hotelId: hold.hotel_id,
    checkInDate: hold.check_in_date,
    checkOutDate: hold.check_out_date,
    expiresAt: hold.expires_at,
    subtotal: quote.subtotal,
    discountAmount: quote.discountAmount,
    discountedSubtotal: quote.discountedSubtotal,
    taxAmount: quote.taxAmount,
    serviceFeeAmount: quote.serviceFeeAmount,
    totalPrice: quote.totalPrice,
    currency: quote.currency,
    promotion: quote.promotion,
    automaticPromotion: quote.automaticPromotion,
    codeOutcome: quote.codeOutcome,
    priceFingerprint: quote.priceFingerprint,
    priceBreakdown: quote,
    cancellationPolicy: quote.cancellationPolicy,
  };
}

module.exports = { previewPromotion };
