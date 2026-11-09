const { Op, literal } = require('sequelize');

const { Promotions } = require('@platform/database');

/**
 * Read-side promotion queries that only serve the guest deals feed.
 *
 * Kept separate from the main promotion repository so that file stays below the
 * architecture god-file threshold.
 */

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

async function findDealCandidates({ limit = 600, now = new Date() } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 600, 1), 2000);

  return await Promotions.findAll({
    where: {
      mode: 'automatic',
      status: 'active',
      ...dateWindowWhere('booking_starts_at', 'booking_ends_at', now),
    },
    attributes: [
      'id',
      'hotel_id',
      'name',
      'discount_type',
      'discount_value',
      'discount_basis_points',
      'max_discount_amount',
      'currency',
      'room_scope',
      'booking_ends_at',
      'stay_starts_on',
      'stay_ends_on',
      'min_nights',
      'min_advance_days',
      'created_at',
    ],
    order: [
      [
        literal(
          "CASE WHEN discount_type = 'percentage' THEN COALESCE(discount_basis_points, 0) ELSE 0 END"
        ),
        'DESC',
      ],
      [
        literal("CASE WHEN discount_type = 'fixed' THEN COALESCE(discount_value, 0) ELSE 0 END"),
        'DESC',
      ],
      ['booking_ends_at', 'ASC'],
      ['id', 'ASC'],
    ],
    limit: safeLimit,
    raw: true,
  });
}

module.exports = { findDealCandidates };
