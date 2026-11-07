const ApiError = require('@utils/ApiError');

const promotionRepository = require('../infrastructure/promotion.repository');
const { toMinor } = require('../domain/money');
const {
  normalizeCode,
  selectBestPromotion,
  toSummary,
  getHotelLocalDate,
} = require('../domain/promotion');
const { isModeEnabled } = require('../domain/flags');

const LIMIT_REASONS = new Set(['limit_reached', 'user_limit_reached']);

function buildPromotionRooms(rooms) {
  return (rooms || []).map((room) => ({
    roomId: String(room.roomId || room.room_id),
    quantity: Number(room.quantity) || 1,
    subtotalMinor:
      room.subtotalMinor !== undefined && room.subtotalMinor !== null
        ? Math.round(Number(room.subtotalMinor) || 0)
        : toMinor(room.subtotal ?? room.totalPrice),
    nightly: (room.nightly || []).map((night) => ({
      date: night.date,
      totalMinor:
        night.totalMinor !== undefined && night.totalMinor !== null
          ? Math.round(Number(night.totalMinor) || 0)
          : toMinor(night.total),
    })),
  }));
}

function toAppliedResult(evaluation) {
  if (!evaluation || !evaluation.eligible) return null;
  return {
    promotion: evaluation.promotion,
    promotionId: evaluation.promotionId,
    promotionVersion: evaluation.promotionVersion,
    mode: evaluation.mode,
    discountAmountMinor: evaluation.discountAmountMinor,
    eligibleSubtotalMinor: evaluation.eligibleSubtotalMinor,
    allocationByRoom: evaluation.allocationByRoom,
    discountedSubtotalMinor: evaluation.discountedSubtotalMinor,
    taxAmountMinor: evaluation.taxAmountMinor,
    serviceFeeAmountMinor: evaluation.serviceFeeAmountMinor,
    totalMinor: evaluation.totalMinor,
  };
}

/**
 * Resolve the single promotion that applies to a basket.
 *
 * Automatic candidates are always evaluated. When a code is supplied it is
 * evaluated without stacking and only wins when its final payable total is
 * strictly lower than the best automatic offer; on a tie the automatic offer
 * wins so a code is not consumed unnecessarily.
 *
 * @param {object} params
 * @param {string} params.hotelId
 * @param {Array<object>} params.rooms pricing room breakdown
 * @param {string} params.checkInDate
 * @param {string} params.checkOutDate
 * @param {string} [params.currency]
 * @param {string} [params.code]
 * @param {string|number} [params.buyerId]
 * @param {Date} [params.now]
 * @param {number} [params.taxRate]
 * @param {number} [params.serviceFeeRate]
 * @param {string} [params.hotelTimezone]
 * @returns {Promise<object>}
 */
async function resolveQuotePromotion({
  hotelId,
  rooms,
  checkInDate,
  checkOutDate,
  currency = 'USD',
  code = null,
  buyerId = null,
  now = new Date(),
  taxRate = 0,
  serviceFeeRate = 0,
  hotelTimezone = null,
}) {
  const promotionRooms = buildPromotionRooms(rooms);
  const originalSubtotalMinor = promotionRooms.reduce((sum, room) => sum + room.subtotalMinor, 0);
  const normalizedCode = normalizeCode(code);

  if (normalizedCode && !isModeEnabled('code')) {
    throw new ApiError(400, 'PROMOTION_NOT_AVAILABLE', 'Promo codes are not available right now');
  }

  // Validate the requested code before loading automatic offers so an invalid
  // code returns a stable error instead of silently disappearing.
  let codePromotion = null;
  let userUsage = null;
  if (normalizedCode) {
    codePromotion = await promotionRepository.findActiveCode(hotelId, normalizedCode);
    if (!codePromotion) {
      throw new ApiError(
        400,
        'PROMOTION_NOT_AVAILABLE',
        'This promo code is not available for the selected hotel'
      );
    }
    if (buyerId) {
      userUsage = await promotionRepository.findUserUsage(codePromotion.id, buyerId);
    }
  }

  const automaticPromotions = isModeEnabled('automatic')
    ? await promotionRepository.findAutomaticForHotels([hotelId], {
        now,
        checkIn: checkInDate,
        checkOut: checkOutDate,
      })
    : [];

  const timezone =
    hotelTimezone ||
    (codePromotion || automaticPromotions.length > 0
      ? await promotionRepository.findHotelTimezone(hotelId)
      : 'UTC');

  const context = {
    now,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    currency: String(currency || 'USD').toUpperCase(),
    hotelTimezone: timezone,
    hotelLocalDate: getHotelLocalDate(now, timezone),
    rooms: promotionRooms,
    buyerId,
    userUsage: userUsage
      ? {
          reservedCount: Number(userUsage.reserved_count) || 0,
          redeemedCount: Number(userUsage.redeemed_count) || 0,
        }
      : { reservedCount: 0, redeemedCount: 0 },
  };

  const selection = selectBestPromotion({
    automaticPromotions,
    codePromotion,
    context,
    originalSubtotalMinor,
    taxRate,
    serviceFeeRate,
  });

  if (codePromotion) {
    const rejection = selection.codeEvaluation;
    if (rejection && !rejection.eligible) {
      const statusCode = LIMIT_REASONS.has(rejection.reason) ? 409 : 400;
      const code =
        rejection.reason === 'limit_reached'
          ? 'PROMOTION_LIMIT_REACHED'
          : rejection.reason === 'user_limit_reached'
            ? 'PROMOTION_USER_LIMIT_REACHED'
            : 'PROMOTION_NOT_ELIGIBLE';
      const message =
        rejection.reason === 'limit_reached'
          ? 'This promo code has reached its usage limit'
          : rejection.reason === 'user_limit_reached'
            ? 'You have already used this promo code the maximum number of times'
            : 'This promo code does not apply to the selected stay';
      throw new ApiError(statusCode, code, message, { reason: rejection.reason });
    }
  }

  const selected = toAppliedResult(selection.selected);
  const automatic = toAppliedResult(selection.bestAutomatic);
  const codeApplied = toAppliedResult(selection.codeEvaluation);

  return {
    selected,
    automatic,
    code: codeApplied,
    codeOutcome: selection.codeOutcome,
    subtotalMinor: originalSubtotalMinor,
    currency: String(currency || 'USD').toUpperCase(),
    normalizedCode,
    // Internal fields used by booking creation to reserve the exact offer.
    selectedPromotion: selection.selected?.promotion || null,
    automaticPromotion: selection.bestAutomatic?.promotion || null,
    codePromotionSummary: codePromotion ? toSummary(codePromotion) : null,
  };
}

module.exports = {
  resolveQuotePromotion,
  buildPromotionRooms,
  toAppliedResult,
};
