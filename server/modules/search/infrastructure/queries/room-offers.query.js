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
 * @param {object} params
 * @param {string[]} params.hotelIds
 * @param {string} params.checkIn date-only string
 * @param {string} params.checkOut date-only string
 * @param {number} params.nights positive night count
 * @param {number} params.rooms requested room count
 * @param {number} params.totalGuests adults + children
 * @param {number} [params.minPrice] minimum average nightly price
 * @param {number} [params.maxPrice] maximum average nightly price
 * @returns {{ sql: string, replacements: object }|null}
 */
function buildOffersQuery(params) {
  const { hotelIds, checkIn, checkOut, nights, rooms, totalGuests, minPrice, maxPrice } = params;

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

  if (Number.isFinite(minPrice)) {
    having.push('avg_price_per_night >= :minPrice');
    replacements.minPrice = minPrice;
  }

  if (Number.isFinite(maxPrice)) {
    having.push('avg_price_per_night <= :maxPrice');
    replacements.maxPrice = maxPrice;
  }

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
      ${FREE_CANCELLATION_EXISTS} AS has_free_cancellation
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
