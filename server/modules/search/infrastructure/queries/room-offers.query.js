/**
 * Batched room-offer SQL for MySQL-only search.
 *
 * One query resolves availability + pricing for every candidate hotel, replacing
 * the previous per-hotel fan-out. Eligibility rules:
 *
 * - every requested night must have an `open` inventory row
 * - nightly available quantity = total_rooms - booked_rooms - held_rooms
 * - the whole stay is bookable only if the MINIMUM nightly quantity covers the
 *   requested room count (quantities are never summed across dates)
 * - `rooms` identical rooms must fit the party: max_guests * rooms >= guests
 * - all nights must share one currency
 *
 * Room type is the unit: a room row is one bookable room type, so the winning
 * offer never stitches different room types across nights.
 */

const FREE_CANCELLATION_EXISTS = `EXISTS (
    SELECT 1
      FROM hotel_cancellation_rules hcr
     WHERE hcr.hotel_id = r.hotel_id
       AND (hcr.room_id = r.id OR hcr.room_id IS NULL)
       AND hcr.is_active = 1
       AND hcr.is_refundable = 1
       AND hcr.free_cancellation_until_hours_before_checkin IS NOT NULL
  )`;

/**
 * Payment condition for one room, using the same precedence as the booking
 * module: the room-specific active rule wins, otherwise the hotel-wide default,
 * otherwise prepay.
 */
const PAYMENT_POLICY_EXPRESSION = `COALESCE(
    (
      SELECT hcr.payment_policy
        FROM hotel_cancellation_rules hcr
       WHERE hcr.hotel_id = r.hotel_id
         AND hcr.room_id = r.id
         AND hcr.is_active = 1
       ORDER BY hcr.updated_at DESC
       LIMIT 1
    ),
    (
      SELECT hcr.payment_policy
        FROM hotel_cancellation_rules hcr
       WHERE hcr.hotel_id = r.hotel_id
         AND hcr.room_id IS NULL
         AND hcr.is_active = 1
       ORDER BY hcr.updated_at DESC
       LIMIT 1
    ),
    'prepay'
  )`;

/**
 * @param {object} params
 * @param {string[]} params.hotelIds
 * @param {string} params.checkIn date-only string
 * @param {string} params.checkOut date-only string
 * @param {number} params.nights positive night count
 * @param {number} params.rooms requested room count
 * @param {number} params.totalGuests adults + children
 * @returns {{ sql: string, replacements: object }|null}
 *
 * Budget filtering is deliberately NOT applied here: an undiscounted room can
 * qualify after its automatic sale, so search applies price constraints to the
 * effective (promotion-aware) offer in the domain layer.
 */
function buildOffersQuery(params) {
  const { hotelIds, checkIn, checkOut, nights, rooms, totalGuests } = params;

  if (!Array.isArray(hotelIds) || hotelIds.length === 0) return null;

  const replacements = {
    checkIn,
    checkOut,
    nights,
    rooms,
    totalGuests,
  };

  const hotelPlaceholders = hotelIds.map((hotelId, index) => {
    replacements[`hotel${index}`] = hotelId;
    return `:hotel${index}`;
  });

  const having = [
    'covered_nights = :nights',
    'min_available_rooms >= :rooms',
    'currency_count = 1',
  ];

  const sql = `
    SELECT
      r.hotel_id,
      r.id AS room_id,
      r.room_name,
      r.room_type,
      r.max_guests,
      r.room_size,
      COUNT(DISTINCT ri.date) AS covered_nights,
      MIN(ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0)) AS min_available_rooms,
      SUM(ri.price_per_night) AS total_price,
      AVG(ri.price_per_night) AS avg_price_per_night,
      MIN(ri.currency) AS currency,
      COUNT(DISTINCT ri.currency) AS currency_count,
      ${FREE_CANCELLATION_EXISTS} AS has_free_cancellation,
      ${PAYMENT_POLICY_EXPRESSION} AS payment_policy
    FROM rooms r
    JOIN room_inventory ri ON ri.room_id = r.id
    WHERE r.hotel_id IN (${hotelPlaceholders.join(', ')})
      AND r.status = 'active'
      AND ri.date >= :checkIn
      AND ri.date < :checkOut
      AND ri.status = 'open'
      AND r.max_guests * :rooms >= :totalGuests
    GROUP BY r.hotel_id, r.id, r.room_name, r.room_type, r.max_guests, r.room_size
    HAVING ${having.join('\n       AND ')}
    ORDER BY r.hotel_id ASC, total_price ASC, r.id ASC`;

  return { sql, replacements };
}

module.exports = { buildOffersQuery };
