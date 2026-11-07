const ApiError = require('@utils/ApiError');

const promotionRepository = require('../../infrastructure/promotion.repository');
const { normalizeCode } = require('../../domain/promotion');

const MODES = new Set(['automatic', 'code']);
const DISCOUNT_TYPES = new Set(['percentage', 'fixed']);
const ROOM_SCOPES = new Set(['all', 'selected']);

function fail(code, message, statusCode = 400) {
  return new ApiError(statusCode, code, message);
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()))
    throw fail('INVALID_PROMOTION_WINDOW', 'Invalid promotion date');
  return date;
}

function toDateOnly(value) {
  if (value === null || value === undefined || value === '') return null;
  return new Date(value).toISOString().slice(0, 10);
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Normalize create/edit input into promotion columns plus materialized room
 * targets. Draft-only economic fields are validated here even though Joi covers
 * the request shape, so service callers (tests, CLI) get the same guarantees.
 */
function normalizePromotionInput(payload = {}, existing = null) {
  const current = existing || {};
  const currentRoomIds = (current.promotionRooms || current.promotion_rooms || [])
    .map((room) => room.room_id || room.roomId)
    .filter(Boolean);

  const mode = payload.mode ?? current.mode ?? 'automatic';
  const discountType = payload.discountType ?? current.discount_type ?? current.discountType;
  const roomScope = payload.roomScope ?? current.room_scope ?? current.roomScope ?? 'all';
  const code = payload.code !== undefined ? payload.code : current.code;
  const normalizedCode = normalizeCode(code);

  if (!MODES.has(mode)) throw fail('INVALID_PROMOTION_MODE', 'Invalid promotion mode');
  if (!DISCOUNT_TYPES.has(discountType)) {
    throw fail('INVALID_DISCOUNT_TYPE', 'Discount type must be percentage or fixed');
  }
  if (!ROOM_SCOPES.has(roomScope)) {
    throw fail('INVALID_ROOM_SCOPE', 'Room scope must be all or selected');
  }

  if (!payload.name && !current.name) {
    throw fail('PROMOTION_NAME_REQUIRED', 'Promotion name is required');
  }

  if (mode === 'code' && !normalizedCode) {
    throw fail('PROMOTION_CODE_REQUIRED', 'A promo code is required for code promotions');
  }

  if (mode === 'automatic' && (payload.totalUseLimit ?? current.total_use_limit)) {
    throw fail(
      'AUTOMATIC_LIMITS_NOT_SUPPORTED',
      'Automatic promotions do not support total or per-user usage limits'
    );
  }
  if (mode === 'automatic' && (payload.perUserLimit ?? current.per_user_limit)) {
    throw fail(
      'AUTOMATIC_LIMITS_NOT_SUPPORTED',
      'Automatic promotions do not support total or per-user usage limits'
    );
  }

  const discountValue =
    payload.discountValue !== undefined ? payload.discountValue : current.discount_value;
  const discountBasisPoints =
    payload.discountBasisPoints !== undefined
      ? payload.discountBasisPoints
      : current.discount_basis_points;

  if (discountType === 'percentage') {
    const points = Number(discountBasisPoints);
    if (!Number.isInteger(points) || points <= 0 || points > 10000) {
      throw fail(
        'INVALID_DISCOUNT_PERCENTAGE',
        'Percentage discount must be between 0.01% and 100%'
      );
    }
  } else if (!(Number(discountValue) > 0)) {
    throw fail('INVALID_DISCOUNT_AMOUNT', 'Fixed discount must be greater than zero');
  }

  const maxDiscount = toNullableNumber(
    payload.maxDiscountAmount !== undefined
      ? payload.maxDiscountAmount
      : current.max_discount_amount
  );
  if (maxDiscount !== null && maxDiscount < 0) {
    throw fail('INVALID_MAX_DISCOUNT', 'Maximum discount cannot be negative');
  }

  const bookingStart = toDate(
    payload.bookingStartsAt !== undefined ? payload.bookingStartsAt : current.booking_starts_at
  );
  const bookingEnd = toDate(
    payload.bookingEndsAt !== undefined ? payload.bookingEndsAt : current.booking_ends_at
  );
  if (bookingStart && bookingEnd && bookingStart >= bookingEnd) {
    throw fail('INVALID_PROMOTION_WINDOW', 'Booking end must be after booking start');
  }

  const stayStart = toDateOnly(
    payload.stayStartsOn !== undefined ? payload.stayStartsOn : current.stay_starts_on
  );
  const stayEnd = toDateOnly(
    payload.stayEndsOn !== undefined ? payload.stayEndsOn : current.stay_ends_on
  );
  if (stayStart && stayEnd && stayStart > stayEnd) {
    throw fail('INVALID_STAY_WINDOW', 'Stay end date must be on or after the stay start date');
  }

  const minNights = toNullableNumber(
    payload.minNights !== undefined ? payload.minNights : current.min_nights
  );
  const minSubtotal = toNullableNumber(
    payload.minSubtotal !== undefined ? payload.minSubtotal : current.min_subtotal
  );
  const minAdvanceDays = toNullableNumber(
    payload.minAdvanceDays !== undefined ? payload.minAdvanceDays : current.min_advance_days
  );
  if (minNights !== null && minNights < 1) {
    throw fail('INVALID_MIN_NIGHTS', 'Minimum nights must be at least 1');
  }
  if (minSubtotal !== null && minSubtotal < 0) {
    throw fail('INVALID_MIN_SUBTOTAL', 'Minimum spend cannot be negative');
  }
  if (minAdvanceDays !== null && minAdvanceDays < 0) {
    throw fail('INVALID_ADVANCE_DAYS', 'Minimum advance days cannot be negative');
  }

  const totalUseLimit =
    mode === 'code'
      ? toNullableNumber(
          payload.totalUseLimit !== undefined ? payload.totalUseLimit : current.total_use_limit
        )
      : null;
  const perUserLimit =
    mode === 'code'
      ? toNullableNumber(
          payload.perUserLimit !== undefined ? payload.perUserLimit : current.per_user_limit
        )
      : null;
  if (totalUseLimit !== null && totalUseLimit < 1) {
    throw fail('INVALID_TOTAL_USE_LIMIT', 'Total use limit must be at least 1');
  }
  if (perUserLimit !== null && perUserLimit < 1) {
    throw fail('INVALID_PER_USER_LIMIT', 'Per-user limit must be at least 1');
  }

  const roomIds =
    mode === 'automatic'
      ? [
          ...new Set(
            (payload.roomIds !== undefined ? payload.roomIds : currentRoomIds)
              .map(String)
              .filter(Boolean)
          ),
        ]
      : [];

  const effectiveRoomScope = mode === 'code' ? 'all' : roomScope;
  if (effectiveRoomScope === 'selected' && roomIds.length === 0) {
    throw fail(
      'PROMOTION_ROOMS_REQUIRED',
      'Select at least one room for a selected-room automatic promotion'
    );
  }

  return {
    values: {
      mode,
      code: mode === 'code' ? String(code).trim() : null,
      normalized_code: mode === 'code' ? normalizedCode : null,
      name: String(payload.name ?? current.name).trim(),
      description:
        payload.description !== undefined ? payload.description : (current.description ?? null),
      discount_type: discountType,
      discount_value: discountType === 'fixed' ? Number(discountValue) : null,
      discount_basis_points: discountType === 'percentage' ? Number(discountBasisPoints) : null,
      currency: 'USD',
      max_discount_amount: discountType === 'percentage' ? maxDiscount : null,
      room_scope: effectiveRoomScope,
      booking_starts_at: bookingStart,
      booking_ends_at: bookingEnd,
      stay_starts_on: stayStart,
      stay_ends_on: stayEnd,
      min_nights: minNights,
      min_subtotal: minSubtotal,
      min_advance_days: minAdvanceDays,
      total_use_limit: totalUseLimit,
      per_user_limit: perUserLimit,
    },
    roomIds: effectiveRoomScope === 'selected' ? roomIds : [],
  };
}

async function assertRoomsBelongToHotel(hotelId, roomIds) {
  if (!roomIds || roomIds.length === 0) return;
  const found = await promotionRepository.findRoomIdsForHotel(hotelId, roomIds);
  if (found.length !== new Set(roomIds).size) {
    throw fail('ROOM_NOT_IN_HOTEL', 'One or more selected rooms do not belong to this hotel');
  }
}

async function assertCodeAvailable(hotelId, normalizedCode, { excludeId = null } = {}) {
  if (!normalizedCode) return;
  const existing = await promotionRepository.findByHotelAndCode(hotelId, normalizedCode, {
    excludeId,
  });
  if (existing) {
    throw new ApiError(
      409,
      'PROMOTION_CODE_EXISTS',
      'This promo code is already used by another promotion for this hotel'
    );
  }
}

function presentPromotion(promotion) {
  if (!promotion) return null;
  const roomIds = (promotion.promotionRooms || []).map((room) => room.room_id);
  return {
    ...promotion,
    room_ids: roomIds,
  };
}

module.exports = {
  normalizePromotionInput,
  assertRoomsBelongToHotel,
  assertCodeAvailable,
  presentPromotion,
};
