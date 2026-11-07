/**
 * Pure promotion eligibility and discount rules.
 *
 * One evaluator is shared by search, room details, holds, previews and booking
 * creation so every surface agrees on which offer applies and how much it saves.
 */

const { toMinor, percentOfMinor, allocateMinor } = require('./money');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEZONE = 'UTC';

function toPlain(value) {
  return value && typeof value.toJSON === 'function' ? value.toJSON() : value;
}

function toDateOnly(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && DATE_ONLY.test(value.trim())) return value.trim();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function daysBetween(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / MS_PER_DAY);
}

/** Hotel-local calendar date for a UTC instant, with a UTC fallback. */
function getHotelLocalDate(now, timezone = DEFAULT_TIMEZONE) {
  const date = now instanceof Date ? now : new Date(now || Date.now());
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
    );
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Trim, upper-case and keep ASCII only so the same code always normalizes alike. */
function normalizeCode(code) {
  if (code === null || code === undefined) return null;
  const normalized = String(code)
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .toUpperCase();
  return normalized || null;
}

function normalizePromotion(promotion) {
  const data = toPlain(promotion) || {};
  const targetRoomIds = Array.isArray(data.targetRoomIds)
    ? data.targetRoomIds
    : (data.promotionRooms || data.promotion_rooms || [])
        .map((target) => target.room_id || target.roomId)
        .filter(Boolean);

  return {
    ...data,
    targetRoomIds: [...new Set(targetRoomIds.map(String))],
    status: data.status,
    mode: data.mode,
    discountType: data.discount_type || data.discountType,
    discountValue: data.discount_value ?? data.discountValue,
    discountBasisPoints: data.discount_basis_points ?? data.discountBasisPoints,
    maxDiscountAmount: data.max_discount_amount ?? data.maxDiscountAmount,
    roomScope: data.room_scope || data.roomScope || 'all',
    bookingStartsAt: data.booking_starts_at ?? data.bookingStartsAt,
    bookingEndsAt: data.booking_ends_at ?? data.bookingEndsAt,
    stayStartsOn: data.stay_starts_on ?? data.stayStartsOn,
    stayEndsOn: data.stay_ends_on ?? data.stayEndsOn,
    minNights: data.min_nights ?? data.minNights,
    minSubtotal: data.min_subtotal ?? data.minSubtotal,
    minAdvanceDays: data.min_advance_days ?? data.minAdvanceDays,
    totalUseLimit: data.total_use_limit ?? data.totalUseLimit,
    perUserLimit: data.per_user_limit ?? data.perUserLimit,
    reservedCount: Number(data.reserved_count ?? data.reservedCount ?? 0),
    redeemedCount: Number(data.redeemed_count ?? data.redeemedCount ?? 0),
    normalizedCode: data.normalized_code ?? data.normalizedCode,
  };
}

/** Public, guest-safe promotion summary (no counters, actors or internal ids). */
function toSummary(promotion) {
  const data = normalizePromotion(promotion);
  return {
    id: data.id,
    mode: data.mode,
    name: data.name,
    description: data.description || null,
    version: Number(data.version) || 1,
    code: data.mode === 'code' ? data.code || data.normalizedCode || null : null,
    discountType: data.discountType,
    discountValue:
      data.discountType === 'fixed'
        ? Number(data.discountValue) || 0
        : Number(data.discountValue) || null,
    discountBasisPoints:
      data.discountType === 'percentage' ? Number(data.discountBasisPoints) || 0 : null,
    maxDiscountAmount:
      data.maxDiscountAmount === null || data.maxDiscountAmount === undefined
        ? null
        : Number(data.maxDiscountAmount),
    roomScope: data.roomScope,
    currency: data.currency,
    minNights: data.minNights ?? null,
    minSubtotal:
      data.minSubtotal === null || data.minSubtotal === undefined ? null : Number(data.minSubtotal),
    minAdvanceDays: data.minAdvanceDays ?? null,
    stayStartsOn: data.stayStartsOn || null,
    stayEndsOn: data.stayEndsOn || null,
    bookingStartsAt: data.bookingStartsAt || null,
    bookingEndsAt: data.bookingEndsAt || null,
  };
}

function ineligible(reason, promotion) {
  return {
    eligible: false,
    reason,
    promotion: promotion ? toSummary(promotion) : null,
    discountAmountMinor: 0,
    eligibleSubtotalMinor: 0,
    allocationByRoom: [],
  };
}

/**
 * Evaluate one promotion against a basket.
 *
 * @param {object} promotion raw/model promotion
 * @param {object} context
 * @param {Date} context.now
 * @param {string} context.checkIn date-only
 * @param {string} context.checkOut date-only
 * @param {Array<{roomId:string, quantity:number, subtotalMinor:number, nightly:Array<{date:string,totalMinor:number}>}>} context.rooms
 * @param {string} context.currency
 * @param {string} [context.hotelTimezone]
 * @param {string} [context.hotelLocalDate] override for tests
 * @param {{reservedCount:number, redeemedCount:number}} [context.userUsage]
 * @returns {object}
 */
function evaluatePromotion(promotion, context) {
  const promo = normalizePromotion(promotion);
  const now = context.now instanceof Date ? context.now : new Date(context.now || Date.now());
  const checkIn = toDateOnly(context.checkIn);
  const checkOut = toDateOnly(context.checkOut);
  const currency = String(context.currency || 'USD').toUpperCase();
  const rooms = context.rooms || [];

  if (!promo || !promo.id) return ineligible('not_found', promotion);
  if (promo.status !== 'active') return ineligible('not_active', promo);
  if (String(promo.currency || 'USD').toUpperCase() !== currency) {
    return ineligible('currency_mismatch', promo);
  }
  if (promo.mode === 'code' && !promo.normalizedCode) return ineligible('invalid_code', promo);

  if (promo.bookingStartsAt && now < new Date(promo.bookingStartsAt)) {
    return ineligible('not_started', promo);
  }
  if (promo.bookingEndsAt && now >= new Date(promo.bookingEndsAt)) {
    return ineligible('ended', promo);
  }

  if (!checkIn || !checkOut || rooms.length === 0) {
    return ineligible('invalid_stay', promo);
  }

  const stayStart = toDateOnly(promo.stayStartsOn);
  const stayEnd = toDateOnly(promo.stayEndsOn);
  const nights = rooms.flatMap((room) =>
    (room.nightly || []).map((night) => ({
      date: toDateOnly(night.date),
      roomId: String(room.roomId),
    }))
  );

  if (nights.length === 0) return ineligible('invalid_stay', promo);

  // Every occupied night must fall inside the offer's stay window. Checkout is
  // excluded, matching the hotel-local night semantics used by pricing.
  if (stayStart || stayEnd) {
    const outside = nights.some(
      (night) => (stayStart && night.date < stayStart) || (stayEnd && night.date > stayEnd)
    );
    if (outside) return ineligible('outside_stay_window', promo);
  }

  const stayNights = daysBetween(checkIn, checkOut);
  if (promo.minNights && stayNights !== null && stayNights < Number(promo.minNights)) {
    return ineligible('below_min_nights', promo);
  }

  if (promo.minAdvanceDays) {
    const localDate =
      context.hotelLocalDate || getHotelLocalDate(now, context.hotelTimezone || DEFAULT_TIMEZONE);
    const advanceDays = daysBetween(localDate, checkIn);
    if (advanceDays !== null && advanceDays < Number(promo.minAdvanceDays)) {
      return ineligible('insufficient_advance', promo);
    }
  }

  const targetRoomIds = new Set(promo.targetRoomIds);
  const appliesToAllRooms = promo.mode === 'code' || promo.roomScope === 'all';

  if (!appliesToAllRooms && targetRoomIds.size === 0) {
    return ineligible('no_target_rooms', promo);
  }

  const eligibleRoom = (room) => appliesToAllRooms || targetRoomIds.has(String(room.roomId));

  const roomWeights = rooms.map((room) => {
    if (!eligibleRoom(room)) return 0;
    const nightlyTotal = (room.nightly || []).reduce(
      (sum, night) =>
        sum +
        (night.totalMinor !== undefined && night.totalMinor !== null
          ? Math.round(Number(night.totalMinor) || 0)
          : toMinor(night.total)),
      0
    );
    if (nightlyTotal) return nightlyTotal;
    return room.subtotalMinor !== undefined && room.subtotalMinor !== null
      ? Math.round(Number(room.subtotalMinor) || 0)
      : toMinor(room.subtotal);
  });

  const eligibleSubtotalMinor = roomWeights.reduce((sum, weight) => sum + weight, 0);
  if (eligibleSubtotalMinor <= 0) return ineligible('no_eligible_rooms', promo);

  if (
    promo.minSubtotal !== null &&
    promo.minSubtotal !== undefined &&
    eligibleSubtotalMinor < toMinor(promo.minSubtotal)
  ) {
    return ineligible('below_min_spend', promo);
  }

  if (promo.mode === 'code') {
    const used = promo.reservedCount + promo.redeemedCount;
    if (promo.totalUseLimit && used >= Number(promo.totalUseLimit)) {
      return ineligible('limit_reached', promo);
    }

    const userUsage = context.userUsage || {};
    const userUsed = Number(userUsage.reservedCount || 0) + Number(userUsage.redeemedCount || 0);
    if (promo.perUserLimit && userUsed >= Number(promo.perUserLimit)) {
      return ineligible('user_limit_reached', promo);
    }
  }

  let discountAmountMinor = 0;
  if (promo.discountType === 'fixed') {
    discountAmountMinor = Math.min(toMinor(promo.discountValue), eligibleSubtotalMinor);
  } else {
    discountAmountMinor = percentOfMinor(eligibleSubtotalMinor, promo.discountBasisPoints);
    if (
      promo.maxDiscountAmount !== null &&
      promo.maxDiscountAmount !== undefined &&
      promo.maxDiscountAmount !== ''
    ) {
      discountAmountMinor = Math.min(discountAmountMinor, toMinor(promo.maxDiscountAmount));
    }
    discountAmountMinor = Math.min(discountAmountMinor, eligibleSubtotalMinor);
  }

  if (discountAmountMinor <= 0) return ineligible('zero_discount', promo);

  const allocation = allocateMinor(discountAmountMinor, roomWeights);

  return {
    eligible: true,
    reason: 'eligible',
    promotion: toSummary(promo),
    promotionId: promo.id,
    promotionVersion: Number(promo.version) || 1,
    mode: promo.mode,
    discountAmountMinor,
    eligibleSubtotalMinor,
    allocationByRoom: rooms.map((room, index) => ({
      roomId: String(room.roomId),
      amountMinor: allocation[index] || 0,
    })),
  };
}

function roundRate(amountMinor, rate) {
  const parsed = Number(rate) || 0;
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(amountMinor * parsed);
}

function withTotals(evaluation, { originalSubtotalMinor, taxRate, serviceFeeRate }) {
  if (!evaluation.eligible) return evaluation;
  const discountedSubtotalMinor = Math.max(
    0,
    originalSubtotalMinor - evaluation.discountAmountMinor
  );
  const taxAmountMinor = roundRate(discountedSubtotalMinor, taxRate);
  const serviceFeeAmountMinor = roundRate(discountedSubtotalMinor, serviceFeeRate);
  return {
    ...evaluation,
    discountedSubtotalMinor,
    taxAmountMinor,
    serviceFeeAmountMinor,
    totalMinor: discountedSubtotalMinor + taxAmountMinor + serviceFeeAmountMinor,
  };
}

function compareEvaluations(a, b) {
  if (a.totalMinor !== b.totalMinor) return a.totalMinor - b.totalMinor;
  // Prefer the automatic offer on an equal total so a code is not consumed.
  if (a.mode !== b.mode) return a.mode === 'automatic' ? -1 : 1;
  return String(a.promotionId).localeCompare(String(b.promotionId));
}

/**
 * Evaluate the automatic candidates plus an optional code candidate, then pick
 * exactly one promotion. No stacking: the lowest final payable total wins.
 */
function selectBestPromotion({
  automaticPromotions = [],
  codePromotion = null,
  context,
  originalSubtotalMinor,
  taxRate = 0,
  serviceFeeRate = 0,
}) {
  const automatic = automaticPromotions
    .map((promotion) => evaluatePromotion(promotion, context))
    .filter((result) => result.eligible)
    .map((result) => withTotals(result, { originalSubtotalMinor, taxRate, serviceFeeRate }))
    .sort(compareEvaluations);

  const bestAutomatic = automatic[0] || null;
  let codeEvaluation = null;
  let codeOutcome = null;

  if (codePromotion) {
    codeEvaluation = withTotals(evaluatePromotion(codePromotion, context), {
      originalSubtotalMinor,
      taxRate,
      serviceFeeRate,
    });

    if (!codeEvaluation.eligible) {
      codeOutcome = {
        status: 'rejected',
        reason: codeEvaluation.reason,
        promotion: codeEvaluation.promotion,
      };
    } else if (!bestAutomatic || compareEvaluations(codeEvaluation, bestAutomatic) < 0) {
      codeOutcome = { status: 'applied', reason: 'code_better' };
    } else {
      codeOutcome = {
        status: 'automatic_better',
        reason: 'automatic_better',
        promotion: codeEvaluation.promotion,
      };
    }
  }

  const selected =
    codeEvaluation && codeEvaluation.eligible && codeOutcome?.status === 'applied'
      ? codeEvaluation
      : bestAutomatic;

  return {
    selected,
    bestAutomatic,
    codeEvaluation,
    codeOutcome,
  };
}

module.exports = {
  DATE_ONLY,
  normalizeCode,
  normalizePromotion,
  toSummary,
  evaluatePromotion,
  selectBestPromotion,
  getHotelLocalDate,
  daysBetween,
  toDateOnly,
};
