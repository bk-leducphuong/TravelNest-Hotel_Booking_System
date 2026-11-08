require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

const { Op } = require('sequelize');
const { uuidv7 } = require('uuidv7');

const db = require('../../models');
const sequelize = require('../../config/database.config');
const { normalizeCode } = require('../../modules/promotion/domain/promotion');

const DAY_MS = 24 * 60 * 60 * 1000;
const COVERAGE_NAME = '[Seed] Coverage Sale — 20% Off';
const DEFAULT_ROOM_COVERAGE = 0.6;

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function money(value) {
  return Number(Number(value).toFixed(2));
}

/**
 * Varied demo promotions for local development.
 *
 * Every promotion is named `[Seed] ...` so re-running the seeder updates the
 * same rows instead of duplicating them. Promotions are spread across several
 * active hotels, including the primary owner's hotel, and cover automatic
 * sales, promo codes, caps, minimum stays/spend, advance booking, room targets
 * and the draft/paused/archived lifecycle states.
 */
const PRESETS = [
  {
    target: 'owner',
    name: '[Seed] Flexible Stay — 12% Off',
    description: 'Automatic 12% sale for every room, valid on most stays.',
    mode: 'automatic',
    discountType: 'percentage',
    percentage: 12,
    roomScope: 'all',
    bookingStartOffsetDays: -30,
    bookingEndOffsetDays: 90,
    status: 'active',
  },
  {
    target: 'owner',
    name: '[Seed] Room Upgrade — $35 Off',
    description: 'Fixed $35 off selected rooms for stays over $200.',
    mode: 'automatic',
    discountType: 'fixed',
    fixedAmount: 35,
    roomScope: 'selected',
    roomCount: 2,
    minSubtotal: 200,
    bookingStartOffsetDays: -30,
    bookingEndOffsetDays: 90,
    status: 'active',
  },
  {
    target: 'owner',
    name: '[Seed] SUMMER25',
    description: '25% off with a $150 cap. Limited to 100 uses, twice per guest.',
    mode: 'code',
    code: 'SUMMER25',
    discountType: 'percentage',
    percentage: 25,
    maxDiscountAmount: 150,
    roomScope: 'all',
    bookingStartOffsetDays: -10,
    bookingEndOffsetDays: 60,
    stayStartOffsetDays: 5,
    stayEndOffsetDays: 90,
    totalUseLimit: 100,
    perUserLimit: 2,
    status: 'active',
  },
  {
    target: 'owner',
    name: '[Seed] WELCOME50',
    description: '$50 off a room subtotal of at least $250. One use per guest.',
    mode: 'code',
    code: 'WELCOME50',
    discountType: 'fixed',
    fixedAmount: 50,
    roomScope: 'all',
    minSubtotal: 250,
    bookingStartOffsetDays: -10,
    bookingEndOffsetDays: 120,
    totalUseLimit: 500,
    perUserLimit: 1,
    status: 'active',
  },
  {
    target: 'owner',
    name: '[Seed] Draft Flash Sale — 20% Off',
    description: 'Draft example for editing and activation in the admin UI.',
    mode: 'automatic',
    discountType: 'percentage',
    percentage: 20,
    maxDiscountAmount: 80,
    roomScope: 'all',
    bookingStartOffsetDays: -7,
    bookingEndOffsetDays: 30,
    status: 'draft',
  },
  {
    target: 'owner',
    name: '[Seed] Paused Member Rate — 10% Off',
    description: 'Paused automatic sale kept for lifecycle testing.',
    mode: 'automatic',
    discountType: 'percentage',
    percentage: 10,
    roomScope: 'all',
    bookingStartOffsetDays: -30,
    bookingEndOffsetDays: 60,
    status: 'paused',
  },
  {
    target: 'owner',
    name: '[Seed] OLD20',
    description: 'Archived code retained for usage/history views.',
    mode: 'code',
    code: 'OLD20',
    discountType: 'percentage',
    percentage: 20,
    roomScope: 'all',
    bookingStartOffsetDays: -120,
    bookingEndOffsetDays: -30,
    totalUseLimit: 20,
    perUserLimit: 1,
    status: 'archived',
  },
  {
    target: 'other',
    hotelIndex: 1,
    name: '[Seed] Long Stay — 15% Off',
    description: '15% off stays of three nights or more.',
    mode: 'automatic',
    discountType: 'percentage',
    percentage: 15,
    roomScope: 'all',
    minNights: 3,
    bookingStartOffsetDays: -20,
    bookingEndOffsetDays: 75,
    stayStartOffsetDays: 5,
    stayEndOffsetDays: 60,
    status: 'active',
  },
  {
    target: 'other',
    hotelIndex: 1,
    name: '[Seed] Last-Minute — 25% Off',
    description: '25% off stays in the next two weeks, capped at $100.',
    mode: 'automatic',
    discountType: 'percentage',
    percentage: 25,
    maxDiscountAmount: 100,
    roomScope: 'all',
    minAdvanceDays: 2,
    bookingStartOffsetDays: -5,
    bookingEndOffsetDays: 45,
    stayStartOffsetDays: 0,
    stayEndOffsetDays: 14,
    status: 'active',
  },
  {
    target: 'other',
    hotelIndex: 2,
    name: '[Seed] Selected Rooms — $20 Off',
    description: 'Fixed $20 off two targeted room types.',
    mode: 'automatic',
    discountType: 'fixed',
    fixedAmount: 20,
    roomScope: 'selected',
    roomCount: 2,
    bookingStartOffsetDays: -20,
    bookingEndOffsetDays: 60,
    status: 'active',
  },
  {
    target: 'other',
    hotelIndex: 2,
    name: '[Seed] WEEKEND15',
    description: '15% weekend code, three uses per guest.',
    mode: 'code',
    code: 'WEEKEND15',
    discountType: 'percentage',
    percentage: 15,
    roomScope: 'all',
    bookingStartOffsetDays: -10,
    bookingEndOffsetDays: 60,
    stayStartOffsetDays: 0,
    stayEndOffsetDays: 60,
    totalUseLimit: 200,
    perUserLimit: 3,
    status: 'active',
  },
  {
    target: 'other',
    hotelIndex: 3,
    name: '[Seed] Early Bird — 10% Off',
    description: '10% off when booking at least 30 days ahead.',
    mode: 'automatic',
    discountType: 'percentage',
    percentage: 10,
    roomScope: 'all',
    minAdvanceDays: 30,
    bookingStartOffsetDays: -20,
    bookingEndOffsetDays: 120,
    stayStartOffsetDays: 30,
    stayEndOffsetDays: 120,
    status: 'active',
  },
  {
    target: 'other',
    hotelIndex: 4,
    name: '[Seed] STAY3SAVE20',
    description: '20% code for stays of three nights or more.',
    mode: 'code',
    code: 'STAY3SAVE20',
    discountType: 'percentage',
    percentage: 20,
    roomScope: 'all',
    minNights: 3,
    bookingStartOffsetDays: -15,
    bookingEndOffsetDays: 90,
    totalUseLimit: 50,
    perUserLimit: 1,
    status: 'active',
  },
  {
    target: 'other',
    hotelIndex: 5,
    name: '[Seed] High-Value Stay — $100 Off',
    description: '$100 off room subtotals of at least $600.',
    mode: 'automatic',
    discountType: 'fixed',
    fixedAmount: 100,
    roomScope: 'all',
    minSubtotal: 600,
    bookingStartOffsetDays: -20,
    bookingEndOffsetDays: 90,
    status: 'active',
  },
  {
    target: 'other',
    hotelIndex: 6,
    name: '[Seed] Capped 30% — Max $75',
    description: '30% automatic sale with a $75 maximum discount.',
    mode: 'automatic',
    discountType: 'percentage',
    percentage: 30,
    maxDiscountAmount: 75,
    roomScope: 'all',
    bookingStartOffsetDays: -20,
    bookingEndOffsetDays: 90,
    status: 'active',
  },
];

async function loadSeedContext() {
  const ownerMembership = await db.hotel_users.findOne({
    where: { is_primary_owner: true },
    order: [['created_at', 'ASC']],
  });

  const ownerHotelId = ownerMembership?.hotel_id || null;

  // Seeded datasets can contain thousands of hotels. Only load the primary
  // owner's hotel plus a small set of alternatives that the presets reference.
  const ownerHotel = ownerHotelId
    ? await db.hotels.findOne({
        where: { id: ownerHotelId, status: 'active' },
        attributes: ['id', 'name'],
      })
    : null;

  const otherHotels = await db.hotels.findAll({
    where: {
      status: 'active',
      ...(ownerHotel ? { id: { [Op.ne]: ownerHotel.id } } : {}),
    },
    attributes: ['id', 'name'],
    order: [['id', 'ASC']],
    limit: 12,
  });

  const ordered = ownerHotel ? [ownerHotel, ...otherHotels] : otherHotels;
  if (ordered.length === 0) return null;

  const roomsByHotel = new Map();
  for (const hotel of ordered) {
    const rooms = await db.rooms.findAll({
      where: { hotel_id: hotel.id, status: 'active' },
      attributes: ['id'],
      order: [['id', 'ASC']],
      limit: 8,
    });
    roomsByHotel.set(
      String(hotel.id),
      rooms.map((room) => room.id)
    );
  }

  return {
    hotels: ordered,
    roomsByHotel,
    ownerUserId: ownerMembership?.user_id || null,
  };
}

function buildValues(hotelId, preset, now) {
  const isPercentage = preset.discountType === 'percentage';
  return {
    hotel_id: hotelId,
    mode: preset.mode,
    code: preset.mode === 'code' ? String(preset.code).trim() : null,
    normalized_code: preset.mode === 'code' ? normalizeCode(preset.code) : null,
    name: preset.name,
    description: preset.description || null,
    status: preset.status || 'draft',
    discount_type: preset.discountType,
    discount_value: isPercentage ? null : money(preset.fixedAmount || 0),
    discount_basis_points: isPercentage ? Math.round(Number(preset.percentage) * 100) : null,
    currency: 'USD',
    max_discount_amount:
      isPercentage && preset.maxDiscountAmount !== undefined
        ? money(preset.maxDiscountAmount)
        : null,
    room_scope: preset.mode === 'code' ? 'all' : preset.roomScope || 'all',
    booking_starts_at:
      preset.bookingStartOffsetDays === undefined
        ? null
        : addDays(now, preset.bookingStartOffsetDays),
    booking_ends_at:
      preset.bookingEndOffsetDays === undefined ? null : addDays(now, preset.bookingEndOffsetDays),
    stay_starts_on:
      preset.stayStartOffsetDays === undefined
        ? null
        : dateOnly(addDays(now, preset.stayStartOffsetDays)),
    stay_ends_on:
      preset.stayEndOffsetDays === undefined
        ? null
        : dateOnly(addDays(now, preset.stayEndOffsetDays)),
    min_nights: preset.minNights ?? null,
    min_subtotal: preset.minSubtotal !== undefined ? money(preset.minSubtotal) : null,
    min_advance_days: preset.minAdvanceDays ?? null,
    total_use_limit: preset.mode === 'code' ? (preset.totalUseLimit ?? null) : null,
    per_user_limit: preset.mode === 'code' ? (preset.perUserLimit ?? null) : null,
  };
}

async function upsertPromotion(context, preset, now) {
  const hotel =
    preset.target === 'owner'
      ? context.hotels[0]
      : context.hotels[preset.hotelIndex] || context.hotels[0];

  if (!hotel) return { status: 'skipped', reason: 'no hotel' };

  const roomIds = (context.roomsByHotel.get(String(hotel.id)) || []).slice(
    0,
    preset.roomCount || 2
  );

  if (preset.roomScope === 'selected' && roomIds.length === 0) {
    return { status: 'skipped', reason: `no rooms for ${hotel.name}` };
  }

  const values = buildValues(hotel.id, preset, now);
  const existing = await db.promotions.findOne({
    where: { hotel_id: hotel.id, name: preset.name },
  });

  if (values.normalized_code) {
    const conflict = await db.promotions.findOne({
      where: {
        hotel_id: hotel.id,
        normalized_code: values.normalized_code,
        ...(existing ? { id: { [Op.ne]: existing.id } } : {}),
      },
    });
    if (conflict) {
      return {
        status: 'skipped',
        reason: `code ${values.normalized_code} already used by ${conflict.name}`,
      };
    }
  }

  let promotion;
  let action;
  if (existing) {
    await existing.update({
      ...values,
      updated_by: context.ownerUserId,
    });
    promotion = existing;
    action = 'updated';
  } else {
    promotion = await db.promotions.create({
      ...values,
      reserved_count: 0,
      redeemed_count: 0,
      version: 1,
      created_by: context.ownerUserId,
      updated_by: context.ownerUserId,
    });
    action = 'created';
  }

  await db.promotion_rooms.destroy({ where: { promotion_id: promotion.id } });
  if (values.room_scope === 'selected') {
    await db.promotion_rooms.bulkCreate(
      roomIds.map((roomId) => ({ promotion_id: promotion.id, room_id: roomId }))
    );
  }

  return { status: action, name: promotion.name, hotel: hotel.name };
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * Cover the requested share of all active rooms with active automatic sales.
 *
 * Existing `[Seed]` automatic promotions count toward coverage first. The
 * remaining rooms are filled deterministically, largest hotels first, so a
 * single seed row can cover many rooms while selected-room promotions only
 * target the rooms that are still uncovered.
 */
async function seedRoomCoverage(context, now) {
  const requested = Number(process.env.SEED_PROMOTION_ROOM_COVERAGE ?? DEFAULT_ROOM_COVERAGE);
  const rate = Number.isFinite(requested) ? Math.min(Math.max(requested, 0), 1) : 0;
  if (rate <= 0) return { rate, totalRooms: 0, coveredRooms: 0, created: 0, updated: 0 };

  const hotelRows = await db.sequelize.query(
    `SELECT id, name
       FROM hotels
      WHERE status = 'active'`,
    { type: db.Sequelize.QueryTypes.SELECT }
  );
  const hotelNames = new Map(hotelRows.map((hotel) => [String(hotel.id), hotel.name]));
  const activeHotelIds = new Set(hotelNames.keys());

  const roomRows = await db.sequelize.query(
    `SELECT id, hotel_id
       FROM rooms
      WHERE status = 'active'`,
    { type: db.Sequelize.QueryTypes.SELECT }
  );

  const activeRoomsByHotel = new Map();
  for (const room of roomRows) {
    const key = String(room.hotel_id);
    if (!activeHotelIds.has(key)) continue;
    const rooms = activeRoomsByHotel.get(key) || [];
    rooms.push(String(room.id));
    activeRoomsByHotel.set(key, rooms);
  }
  for (const rooms of activeRoomsByHotel.values()) rooms.sort();

  const totalRooms = [...activeRoomsByHotel.values()].reduce((sum, rooms) => sum + rooms.length, 0);
  const targetRooms = Math.ceil(totalRooms * rate);

  const activeSeedPromotions = await db.promotions.findAll({
    where: {
      status: 'active',
      mode: 'automatic',
      name: { [Op.like]: '[Seed]%' },
    },
    attributes: ['id', 'hotel_id', 'room_scope'],
    include: [
      {
        model: db.promotion_rooms,
        as: 'promotionRooms',
        attributes: ['room_id'],
        required: false,
      },
    ],
  });

  const covered = new Set();
  for (const promotion of activeSeedPromotions) {
    const hotelRooms = activeRoomsByHotel.get(String(promotion.hotel_id)) || [];
    if (promotion.room_scope === 'all') {
      hotelRooms.forEach((roomId) => covered.add(roomId));
    } else {
      (promotion.promotionRooms || []).forEach((target) => {
        if (hotelRooms.includes(String(target.room_id))) covered.add(String(target.room_id));
      });
    }
  }

  // First run: no coverage rows exist. Reruns should converge on the same
  // hotels/rooms without creating duplicates.
  const existingCoverage = await db.promotions.findAll({
    where: { name: COVERAGE_NAME },
    attributes: ['id', 'hotel_id', 'version', 'status'],
  });
  const existingByHotel = new Map(
    existingCoverage.map((promotion) => [String(promotion.hotel_id), promotion])
  );

  const hotelIds = [...activeRoomsByHotel.keys()];

  const uncovered = hotelIds
    .map((hotelId) => ({
      hotelId,
      hotelName: hotelNames.get(hotelId) || hotelId,
      rooms: (activeRoomsByHotel.get(hotelId) || []).filter((roomId) => !covered.has(roomId)),
    }))
    .filter((entry) => entry.rooms.length > 0)
    .sort((a, b) => b.rooms.length - a.rooms.length || a.hotelId.localeCompare(b.hotelId));

  let needed = Math.max(0, targetRooms - covered.size);
  const plan = [];

  for (const hotel of uncovered) {
    if (needed <= 0) break;
    const take = Math.min(hotel.rooms.length, needed);
    const roomIds = hotel.rooms.slice(0, take);
    roomIds.forEach((roomId) => covered.add(roomId));
    needed -= take;
    plan.push({
      hotelId: hotel.hotelId,
      hotelName: hotel.hotelName,
      roomIds,
      roomScope:
        roomIds.length === (activeRoomsByHotel.get(hotel.hotelId) || []).length
          ? 'all'
          : 'selected',
    });
  }

  if (plan.length === 0) {
    console.log(
      `\n✅ Room coverage already satisfies ${(rate * 100).toFixed(0)}% (${covered.size}/${totalRooms} rooms).`
    );
    return { rate, totalRooms, coveredRooms: covered.size, created: 0, updated: 0 };
  }

  const coveragePreset = {
    name: COVERAGE_NAME,
    mode: 'automatic',
    discountType: 'percentage',
    percentage: 20,
    roomScope: 'all',
    bookingStartOffsetDays: -30,
    bookingEndOffsetDays: 120,
    status: 'active',
  };

  const newPromotions = [];
  const newTargets = [];
  const updates = [];

  for (const entry of plan) {
    const values = buildValues(entry.hotelId, coveragePreset, now);
    values.room_scope = entry.roomScope;

    const existing = existingByHotel.get(String(entry.hotelId));
    if (existing) {
      updates.push({ promotion: existing, values, roomIds: entry.roomIds });
      continue;
    }

    const id = uuidv7();
    newPromotions.push({
      ...values,
      id,
      hotel_id: entry.hotelId,
      status: 'active',
      reserved_count: 0,
      redeemed_count: 0,
      version: 1,
      created_by: context.ownerUserId,
      updated_by: context.ownerUserId,
    });
    if (entry.roomScope === 'selected') {
      newTargets.push(
        ...entry.roomIds.map((roomId) => ({
          promotion_id: id,
          room_id: roomId,
        }))
      );
    }
  }

  for (const batch of chunk(newPromotions, 500)) {
    await db.promotions.bulkCreate(batch);
  }
  for (const batch of chunk(newTargets, 1000)) {
    await db.promotion_rooms.bulkCreate(batch);
  }

  for (const update of updates) {
    await db.promotions.update(
      {
        ...update.values,
        version: Number(update.promotion.version) + 1,
        updated_by: context.ownerUserId,
      },
      { where: { id: update.promotion.id } }
    );
    await db.promotion_rooms.destroy({ where: { promotion_id: update.promotion.id } });
    if (update.values.room_scope === 'selected') {
      await db.promotion_rooms.bulkCreate(
        update.roomIds.map((roomId) => ({
          promotion_id: update.promotion.id,
          room_id: roomId,
        }))
      );
    }
  }

  console.log(
    `\n✅ Room coverage seeded: ${newPromotions.length} created, ${updates.length} updated — ` +
      `${covered.size}/${totalRooms} active rooms (${((covered.size / totalRooms) * 100).toFixed(1)}%), target ${(rate * 100).toFixed(0)}%.`
  );

  return {
    rate,
    totalRooms,
    coveredRooms: covered.size,
    created: newPromotions.length,
    updated: updates.length,
  };
}

async function seedPromotions() {
  const now = new Date();
  const context = await loadSeedContext();

  if (!context) {
    console.log('⚠️  No active hotels found; skipping promotion seed.');
    return { created: 0, updated: 0, skipped: 0 };
  }

  const summary = { created: 0, updated: 0, skipped: 0 };
  const details = [];

  for (const preset of PRESETS) {
    const result = await upsertPromotion(context, preset, now);
    summary[result.status] = (summary[result.status] || 0) + 1;
    details.push(result);
    if (result.status === 'skipped') {
      console.log(`  ⚠️  Skipped ${preset.name}: ${result.reason}`);
    } else {
      console.log(`  ✅ ${result.status}: ${result.name} (${result.hotel})`);
    }
  }

  summary.coverage = await seedRoomCoverage(context, now);

  console.log(
    `\n✅ Promotions seeded: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`
  );
  return summary;
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      await seedPromotions();
      await sequelize.close();
    } catch (error) {
      console.error('❌ Promotion seed failed:', error);
      await sequelize.close().catch(() => {});
      process.exit(1);
    }
  })();
}

module.exports = { seedPromotions, PRESETS };
