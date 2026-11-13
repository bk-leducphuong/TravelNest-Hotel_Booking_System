const { randomUUID } = require('node:crypto');

const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_STATUSES = ['confirmed', 'checked_in'];
const ALLOWED_STATUSES = new Set([
  'pending',
  'pending_payment',
  'confirmed',
  'payment_failed',
  'expired',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
]);

function normalizeStatuses(statuses) {
  const list = (Array.isArray(statuses) ? statuses : DEFAULT_STATUSES)
    .map((status) => String(status || '').trim())
    .filter((status) => status && status !== 'expired');

  const invalid = list.filter((status) => !ALLOWED_STATUSES.has(status));
  if (invalid.length) {
    throw new Error(`Unknown booking status: ${invalid.join(', ')}`);
  }

  return list.length ? [...new Set(list)] : DEFAULT_STATUSES;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  const date = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('since must be a YYYY-MM-DD date');
  }
  return date;
}

function normalizeUuid(value, name) {
  if (!value) {
    return null;
  }
  const id = String(value).trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`${name} must be a UUID`);
  }
  return id;
}

function normalizePositiveInt(value, fallback, name) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

/**
 * Create missing conversation threads for existing bookings.
 *
 * Safe to run repeatedly: the unique `conversations.booking_id` index plus
 * `INSERT IGNORE` make every batch idempotent, and each batch is independent so
 * an interrupted run resumes where it stopped.
 *
 * Defaults are deliberately conservative: only active/future stays
 * (`confirmed`, `checked_in`, check-out today or later). Pass `all`, `since`,
 * or `statuses` to widen the scope.
 */
async function backfillConversations({
  sequelize,
  dryRun = false,
  all = false,
  since = null,
  statuses = DEFAULT_STATUSES,
  hotelId = null,
  bookingId = null,
  limit = null,
  batchSize = DEFAULT_BATCH_SIZE,
} = {}) {
  if (!sequelize) {
    throw new Error('sequelize is required');
  }

  const safeBatchSize = normalizePositiveInt(batchSize, DEFAULT_BATCH_SIZE, 'batchSize');
  const remainingLimit = limit ? normalizePositiveInt(limit, null, 'limit') : null;
  const safeStatuses = normalizeStatuses(statuses);
  const safeSince = normalizeDate(since);
  const safeHotelId = normalizeUuid(hotelId, 'hotelId');
  const safeBookingId = normalizeUuid(bookingId, 'bookingId');

  let lastId = null;
  let scanned = 0;
  let created = 0;
  let batches = 0;

  while (true) {
    const remaining = remainingLimit ? remainingLimit - scanned : null;
    if (remaining !== null && remaining <= 0) {
      break;
    }
    const effectiveLimit = remaining === null ? safeBatchSize : Math.min(safeBatchSize, remaining);

    const where = [
      'b.deleted_at IS NULL',
      'b.buyer_id IS NOT NULL',
      'b.hotel_id IS NOT NULL',
      "b.status <> 'expired'",
      'b.status IN (:statuses)',
      'NOT EXISTS (SELECT 1 FROM conversations c WHERE c.booking_id = b.id)',
    ];

    if (safeSince) {
      where.push('b.check_out_date >= :since');
    } else if (!all) {
      where.push('b.check_out_date >= CURDATE()');
    }
    if (safeHotelId) {
      where.push('b.hotel_id = :hotelId');
    }
    if (safeBookingId) {
      where.push('b.id = :bookingId');
    }
    if (lastId) {
      where.push('b.id > :lastId');
    }

    const [rows] = await sequelize.query(
      `SELECT b.id, b.hotel_id, b.buyer_id
         FROM bookings b
        WHERE ${where.join(' AND ')}
        ORDER BY b.id ASC
        LIMIT ${effectiveLimit}`,
      {
        replacements: {
          statuses: safeStatuses,
          ...(safeSince ? { since: safeSince } : {}),
          ...(safeHotelId ? { hotelId: safeHotelId } : {}),
          ...(safeBookingId ? { bookingId: safeBookingId } : {}),
          ...(lastId ? { lastId } : {}),
        },
      }
    );

    if (!rows.length) {
      break;
    }

    batches += 1;
    scanned += rows.length;

    if (dryRun) {
      created += rows.length;
    } else {
      const values = rows
        .map(
          (row) =>
            `(${sequelize.escape(randomUUID())}, ` +
            `${sequelize.escape(row.hotel_id)}, ` +
            `${sequelize.escape(row.id)}, ` +
            `${sequelize.escape(row.buyer_id)}, 0, 'open', NOW(6), NOW(6))`
        )
        .join(', ');

      const [result, metadata] = await sequelize.query(
        `INSERT IGNORE INTO conversations
           (id, hotel_id, booking_id, guest_user_id, last_message_seq, status, created_at, updated_at)
         VALUES ${values}`
      );

      created += Number(
        metadata?.affectedRows ??
          result?.affectedRows ??
          (typeof result === 'number' ? result : rows.length)
      );
    }

    lastId = rows[rows.length - 1].id;

    if (safeBookingId) {
      break;
    }
  }

  return {
    dryRun,
    scanned,
    created,
    batches,
    statuses: safeStatuses,
    since: safeSince,
    all,
    hotelId: safeHotelId,
    bookingId: safeBookingId,
  };
}

module.exports = {
  backfillConversations,
  normalizeStatuses,
  normalizeDate,
  DEFAULT_STATUSES,
};
