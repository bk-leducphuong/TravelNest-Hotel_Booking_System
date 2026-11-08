const { Op, Transaction } = require('sequelize');

const {
  Bookings,
  Hotels,
  PromotionRedemptions,
  PromotionRooms,
  PromotionUserUsage,
  Promotions,
  Rooms,
  Users,
} = require('@platform/database');

/**
 * Promotion persistence. Sequelize access stays in this repository; the rest of
 * the module works with plain objects.
 */

function toPlain(value) {
  return value && typeof value.toJSON === 'function' ? value.toJSON() : value;
}

function promotionInclude() {
  return [
    {
      model: PromotionRooms,
      as: 'promotionRooms',
      attributes: ['room_id'],
      required: false,
    },
  ];
}

function dateWindowWhere(fieldStart, fieldEnd, now) {
  return {
    [Op.and]: [
      {
        [Op.or]: [{ [fieldStart]: null }, { [fieldStart]: { [Op.lte]: now } }],
      },
      {
        [Op.or]: [{ [fieldEnd]: null }, { [fieldEnd]: { [Op.gt]: now } }],
      },
    ],
  };
}

async function findAutomaticForHotels(hotelIds, { now = new Date(), checkIn, checkOut } = {}) {
  if (!Array.isArray(hotelIds) || hotelIds.length === 0) return [];

  const where = {
    hotel_id: { [Op.in]: hotelIds },
    mode: 'automatic',
    status: 'active',
    ...dateWindowWhere('booking_starts_at', 'booking_ends_at', now),
  };

  if (checkIn && checkOut) {
    where[Op.and] = [
      ...(where[Op.and] || []),
      { [Op.or]: [{ stay_starts_on: null }, { stay_starts_on: { [Op.lte]: checkOut } }] },
      { [Op.or]: [{ stay_ends_on: null }, { stay_ends_on: { [Op.gte]: checkIn } }] },
    ];
  }

  const rows = await Promotions.findAll({
    where,
    include: promotionInclude(),
    order: [
      ['id', 'ASC'],
      [{ model: PromotionRooms, as: 'promotionRooms' }, 'room_id', 'ASC'],
    ],
  });

  return rows.map(toPlain);
}

async function findByHotelAndCode(hotelId, normalizedCode, { excludeId = null } = {}) {
  if (!hotelId || !normalizedCode) return null;
  const where = {
    hotel_id: hotelId,
    normalized_code: normalizedCode,
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  const row = await Promotions.findOne({ where });
  return toPlain(row);
}

async function findActiveCode(hotelId, normalizedCode) {
  if (!hotelId || !normalizedCode) return null;
  const row = await Promotions.findOne({
    where: {
      hotel_id: hotelId,
      mode: 'code',
      normalized_code: normalizedCode,
      status: 'active',
    },
    include: promotionInclude(),
  });
  return toPlain(row);
}

async function findById(promotionId, options = {}) {
  const row = await Promotions.findByPk(promotionId, {
    include: promotionInclude(),
    ...options,
  });
  return row ? toPlain(row) : null;
}

async function findByIdForUpdate(promotionId, { transaction } = {}) {
  const row = await Promotions.findByPk(promotionId, {
    transaction,
    lock: Transaction.LOCK.UPDATE,
    include: promotionInclude(),
  });
  return row ? toPlain(row) : null;
}

async function listByHotel(hotelId, filters = {}, { limit = 20, offset = 0 } = {}) {
  const where = { hotel_id: hotelId };
  if (filters.mode) where.mode = filters.mode;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.name = { [Op.like]: `%${String(filters.search).trim()}%` };
  }

  const result = await Promotions.findAndCountAll({
    where,
    include: promotionInclude(),
    order: [
      ['created_at', 'DESC'],
      ['id', 'ASC'],
    ],
    limit,
    offset,
    distinct: true,
  });

  return { rows: result.rows.map(toPlain), count: result.count };
}

async function createPromotion(data, options = {}) {
  const row = await Promotions.create(data, options);
  return toPlain(row);
}

async function updatePromotion(promotionId, data, options = {}) {
  const [count] = await Promotions.update(data, {
    where: { id: promotionId },
    ...options,
  });
  return count;
}

/**
 * Optimistic update for draft editing: only succeeds when the caller's version
 * still matches the persisted row.
 */
async function updateDraftWithVersion(promotionId, expectedVersion, data, options = {}) {
  const [count] = await Promotions.update(
    { ...data, version: Number(expectedVersion) + 1 },
    {
      where: { id: promotionId, version: expectedVersion, status: 'draft' },
      ...options,
    }
  );
  return count;
}

async function setPromotionRooms(promotionId, roomIds, { transaction } = {}) {
  await PromotionRooms.destroy({ where: { promotion_id: promotionId }, transaction });
  if (!Array.isArray(roomIds) || roomIds.length === 0) return;
  await PromotionRooms.bulkCreate(
    [...new Set(roomIds)].map((roomId) => ({
      promotion_id: promotionId,
      room_id: roomId,
    })),
    { transaction }
  );
}

async function findRoomIdsForHotel(hotelId, roomIds) {
  if (!Array.isArray(roomIds) || roomIds.length === 0) return [];
  const rows = await Rooms.findAll({
    where: { id: { [Op.in]: roomIds }, hotel_id: hotelId },
    attributes: ['id'],
  });
  return rows.map((row) => row.id);
}

async function findHotelTimezones(hotelIds) {
  if (!Array.isArray(hotelIds) || hotelIds.length === 0) return new Map();
  const rows = await Hotels.findAll({
    where: { id: { [Op.in]: hotelIds } },
    attributes: ['id', 'timezone'],
  });
  return new Map(rows.map((row) => [String(row.id), row.timezone || 'UTC']));
}

async function findHotelTimezone(hotelId) {
  const row = await Hotels.findByPk(hotelId, { attributes: ['id', 'timezone'] });
  return row?.timezone || 'UTC';
}

// --- Redemptions and usage counters ---

async function findUserUsage(promotionId, buyerId, options = {}) {
  const row = await PromotionUserUsage.findOne({
    where: { promotion_id: promotionId, buyer_id: buyerId },
    ...options,
  });
  return toPlain(row);
}

async function findUserUsageForUpdate(promotionId, buyerId, { transaction } = {}) {
  const row = await PromotionUserUsage.findOne({
    where: { promotion_id: promotionId, buyer_id: buyerId },
    transaction,
    lock: Transaction.LOCK.UPDATE,
  });
  return toPlain(row);
}

async function createUserUsage(data, options = {}) {
  const row = await PromotionUserUsage.create(data, options);
  return toPlain(row);
}

async function incrementPromotionCounters(
  promotionId,
  { reserved = 0, redeemed = 0 },
  options = {}
) {
  const values = {};
  if (reserved) values.reserved_count = reserved;
  if (redeemed) values.redeemed_count = redeemed;
  if (Object.keys(values).length === 0) return;
  await Promotions.increment(values, { where: { id: promotionId }, ...options });
}

async function decrementPromotionCounters(
  promotionId,
  { reserved = 0, redeemed = 0 },
  options = {}
) {
  const values = {};
  if (reserved) values.reserved_count = reserved;
  if (redeemed) values.redeemed_count = redeemed;
  if (Object.keys(values).length === 0) return;
  await Promotions.decrement(values, { where: { id: promotionId }, ...options });
}

async function incrementUserUsage(
  promotionId,
  buyerId,
  { reserved = 0, redeemed = 0 },
  options = {}
) {
  const values = {};
  if (reserved) values.reserved_count = reserved;
  if (redeemed) values.redeemed_count = redeemed;
  if (Object.keys(values).length === 0) return;
  await PromotionUserUsage.increment(values, {
    where: { promotion_id: promotionId, buyer_id: buyerId },
    ...options,
  });
}

async function decrementUserUsage(
  promotionId,
  buyerId,
  { reserved = 0, redeemed = 0 },
  options = {}
) {
  const values = {};
  if (reserved) values.reserved_count = reserved;
  if (redeemed) values.redeemed_count = redeemed;
  if (Object.keys(values).length === 0) return;
  await PromotionUserUsage.decrement(values, {
    where: { promotion_id: promotionId, buyer_id: buyerId },
    ...options,
  });
}

async function createRedemption(data, options = {}) {
  const row = await PromotionRedemptions.create(data, options);
  return toPlain(row);
}

async function findRedemptionByBookingId(bookingId, options = {}) {
  const row = await PromotionRedemptions.findOne({
    where: { booking_id: bookingId },
    ...options,
  });
  return toPlain(row);
}

async function findRedemptionByBookingIdForUpdate(bookingId, { transaction } = {}) {
  const row = await PromotionRedemptions.findOne({
    where: { booking_id: bookingId },
    transaction,
    lock: Transaction.LOCK.UPDATE,
  });
  return toPlain(row);
}

async function updateRedemption(redemptionId, data, options = {}) {
  const [count] = await PromotionRedemptions.update(data, {
    where: { id: redemptionId },
    ...options,
  });
  return count;
}

async function findOverdueReservations(now, { limit = 100 } = {}) {
  const rows = await PromotionRedemptions.findAll({
    where: {
      status: 'reserved',
      reservation_expires_at: { [Op.ne]: null, [Op.lte]: now },
    },
    order: [['reservation_expires_at', 'ASC']],
    limit,
  });
  return rows.map(toPlain);
}

async function listRedemptionsByPromotion(promotionId, { limit = 20, offset = 0 } = {}) {
  const result = await PromotionRedemptions.findAndCountAll({
    where: { promotion_id: promotionId },
    include: [
      {
        model: Bookings,
        as: 'booking',
        attributes: ['id', 'booking_code', 'status', 'check_in_date', 'check_out_date'],
        required: false,
      },
      {
        model: Users,
        as: 'buyer',
        attributes: ['id', 'email', 'first_name', 'last_name'],
        required: false,
      },
    ],
    order: [
      ['created_at', 'DESC'],
      ['id', 'ASC'],
    ],
    limit,
    offset,
  });
  return { rows: result.rows.map(toPlain), count: result.count };
}

module.exports = {
  toPlain,
  findAutomaticForHotels,
  findByHotelAndCode,
  findActiveCode,
  findById,
  findByIdForUpdate,
  listByHotel,
  createPromotion,
  updatePromotion,
  updateDraftWithVersion,
  setPromotionRooms,
  findRoomIdsForHotel,
  findHotelTimezones,
  findHotelTimezone,
  findUserUsage,
  findUserUsageForUpdate,
  createUserUsage,
  incrementPromotionCounters,
  decrementPromotionCounters,
  incrementUserUsage,
  decrementUserUsage,
  createRedemption,
  findRedemptionByBookingId,
  findRedemptionByBookingIdForUpdate,
  updateRedemption,
  findOverdueReservations,
  listRedemptionsByPromotion,
};
