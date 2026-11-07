const ApiError = require('@utils/ApiError');
const promotionRepository = require('../infrastructure/promotion.repository');

function toMinorNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Reserve one promotion for a booking inside the caller's transaction.
 *
 * The promotion row is locked first, then the per-user usage row. Limited code
 * promotions check both the total and per-user counters under that lock so two
 * concurrent checkouts cannot exceed a limit.
 *
 * @returns {Promise<object|null>} redemption row
 */
async function reservePromotion(
  {
    promotion,
    promotionId,
    bookingId,
    buyerId,
    hotelId,
    discountAmount,
    currency = 'USD',
    reservationExpiresAt = null,
    promotionSnapshot = null,
  },
  { transaction } = {}
) {
  if (!promotionId) return null;

  const locked = await promotionRepository.findByIdForUpdate(promotionId, { transaction });
  if (!locked || locked.status !== 'active') {
    throw new ApiError(
      409,
      'PRICE_CHANGED',
      'The selected offer is no longer available. Please review the updated price.'
    );
  }

  if (promotion?.version && Number(promotion.version) !== Number(locked.version)) {
    throw new ApiError(
      409,
      'PRICE_CHANGED',
      'The selected offer has changed. Please review the updated price.'
    );
  }

  if (locked.mode === 'code') {
    const used = toMinorNumber(locked.reserved_count) + toMinorNumber(locked.redeemed_count);
    if (locked.total_use_limit && used >= Number(locked.total_use_limit)) {
      throw new ApiError(
        409,
        'PROMOTION_LIMIT_REACHED',
        'This promo code has reached its usage limit'
      );
    }

    let usage = await promotionRepository.findUserUsageForUpdate(locked.id, buyerId, {
      transaction,
    });
    if (!usage) {
      usage = await promotionRepository.createUserUsage(
        { promotion_id: locked.id, buyer_id: buyerId },
        { transaction }
      );
    }

    const userUsed = toMinorNumber(usage.reserved_count) + toMinorNumber(usage.redeemed_count);
    if (locked.per_user_limit && userUsed >= Number(locked.per_user_limit)) {
      throw new ApiError(
        409,
        'PROMOTION_USER_LIMIT_REACHED',
        'You have already used this promo code the maximum number of times'
      );
    }
  }

  const redemption = await promotionRepository.createRedemption(
    {
      promotion_id: locked.id,
      booking_id: bookingId,
      buyer_id: buyerId,
      hotel_id: hotelId,
      status: 'reserved',
      discount_amount: discountAmount || 0,
      currency: String(currency || 'USD').toUpperCase(),
      promotion_version: Number(locked.version) || 1,
      promotion_snapshot: promotionSnapshot,
      reservation_expires_at: reservationExpiresAt,
      reserved_at: new Date(),
    },
    { transaction }
  );

  if (locked.mode === 'code') {
    await promotionRepository.incrementPromotionCounters(
      locked.id,
      { reserved: 1 },
      { transaction }
    );
    await promotionRepository.incrementUserUsage(
      locked.id,
      buyerId,
      { reserved: 1 },
      { transaction }
    );
  }

  return redemption;
}

/**
 * Mark a reserved promotion as redeemed exactly once. A released redemption is
 * never revived: late payments are handled as refunds by the payment flow.
 */
async function redeemPromotion(bookingId, { transaction } = {}) {
  const redemption = await promotionRepository.findRedemptionByBookingIdForUpdate(bookingId, {
    transaction,
  });

  if (!redemption) return null;
  if (redemption.status === 'redeemed') return redemption;
  if (redemption.status !== 'reserved') return null;

  await promotionRepository.updateRedemption(
    redemption.id,
    { status: 'redeemed', redeemed_at: new Date() },
    { transaction }
  );

  const promotion = await promotionRepository.findById(redemption.promotion_id, { transaction });
  if (promotion?.mode === 'code') {
    await promotionRepository.decrementPromotionCounters(
      redemption.promotion_id,
      { reserved: 1 },
      { transaction }
    );
    await promotionRepository.incrementPromotionCounters(
      redemption.promotion_id,
      { redeemed: 1 },
      { transaction }
    );
    await promotionRepository.decrementUserUsage(
      redemption.promotion_id,
      redemption.buyer_id,
      { reserved: 1 },
      { transaction }
    );
    await promotionRepository.incrementUserUsage(
      redemption.promotion_id,
      redemption.buyer_id,
      { redeemed: 1 },
      { transaction }
    );
  }

  return { ...redemption, status: 'redeemed' };
}

/**
 * Release an unpaid reservation exactly once. Paid bookings keep their usage
 * permanently, even after a refund, so campaign limits stay predictable.
 */
async function releasePromotion(bookingId, { reason = 'booking_terminal' } = {}) {
  const transaction = await require('@config/database.config').transaction();
  try {
    const redemption = await promotionRepository.findRedemptionByBookingIdForUpdate(bookingId, {
      transaction,
    });

    if (!redemption || redemption.status !== 'reserved') {
      await transaction.commit();
      return redemption || null;
    }

    await promotionRepository.updateRedemption(
      redemption.id,
      {
        status: 'released',
        released_at: new Date(),
        release_reason: String(reason).slice(0, 100),
      },
      { transaction }
    );

    const promotion = await promotionRepository.findById(redemption.promotion_id, { transaction });
    if (promotion?.mode === 'code') {
      await promotionRepository.decrementPromotionCounters(
        redemption.promotion_id,
        { reserved: 1 },
        { transaction }
      );
      await promotionRepository.decrementUserUsage(
        redemption.promotion_id,
        redemption.buyer_id,
        { reserved: 1 },
        { transaction }
      );
    }

    await transaction.commit();
    return { ...redemption, status: 'released' };
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

/** Transaction-aware variant for booking cancellation/expiry paths. */
async function releasePromotionInTransaction(
  bookingId,
  { reason = 'booking_terminal', transaction }
) {
  const redemption = await promotionRepository.findRedemptionByBookingIdForUpdate(bookingId, {
    transaction,
  });

  if (!redemption || redemption.status !== 'reserved') return redemption || null;

  await promotionRepository.updateRedemption(
    redemption.id,
    {
      status: 'released',
      released_at: new Date(),
      release_reason: String(reason).slice(0, 100),
    },
    { transaction }
  );

  const promotion = await promotionRepository.findById(redemption.promotion_id, { transaction });
  if (promotion?.mode === 'code') {
    await promotionRepository.decrementPromotionCounters(
      redemption.promotion_id,
      { reserved: 1 },
      { transaction }
    );
    await promotionRepository.decrementUserUsage(
      redemption.promotion_id,
      redemption.buyer_id,
      { reserved: 1 },
      { transaction }
    );
  }

  return { ...redemption, status: 'released' };
}

module.exports = {
  reservePromotion,
  redeemPromotion,
  releasePromotion,
  releasePromotionInTransaction,
};
