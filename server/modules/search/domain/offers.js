/**
 * Room-offer rules (pure).
 *
 * A "offer" is one bookable room type for the whole requested stay. Every
 * calculation here is shared by hotel search and the single-hotel availability
 * endpoint so both always agree on what is bookable.
 */

/** Prices are stored as DECIMAL(10,2); do arithmetic in minor units. */
const PRICE_SCALE = 100;

function toMinorUnits(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * PRICE_SCALE) : null;
}

function fromMinorUnits(value) {
  return value === null || value === undefined ? null : value / PRICE_SCALE;
}

/**
 * Normalize one aggregated SQL row into the response offer shape.
 *
 * Units (explicit, unchanged from the existing contract):
 * - `total_price` is the selected-stay subtotal for ONE room
 * - `total_price_for_requested_rooms` is the same subtotal multiplied by the
 *   requested room count
 * - `price_per_night` is the average per room per night
 * - `currency` is the inventory currency; all nights in an offer share it
 */
function normalizeOffer(row, { nights, rooms }) {
  const totalMinor = toMinorUnits(row.total_price);
  const perNightMinor = toMinorUnits(row.avg_price_per_night);

  return {
    room_id: row.room_id,
    room_name: row.room_name,
    room_type: row.room_type,
    max_guests: Number(row.max_guests),
    room_size: row.room_size === null || row.room_size === undefined ? null : Number(row.room_size),
    nights,
    rooms,
    available_rooms: Number(row.min_available_rooms),
    currency: row.currency,
    total_price: fromMinorUnits(totalMinor),
    total_price_for_requested_rooms: fromMinorUnits(
      totalMinor === null ? null : totalMinor * rooms
    ),
    price_per_night: fromMinorUnits(perNightMinor),
    has_free_cancellation: Boolean(Number(row.has_free_cancellation)),
  };
}

function byPriceThenRoom(a, b) {
  const aMinor = toMinorUnits(a.total_price) ?? Number.MAX_SAFE_INTEGER;
  const bMinor = toMinorUnits(b.total_price) ?? Number.MAX_SAFE_INTEGER;
  return aMinor - bMinor || String(a.room_id).localeCompare(String(b.room_id));
}

/**
 * Apply the request-specific offer constraints and pick the cheapest eligible
 * offer. Budget is applied before selection so a hotel is never represented by
 * an offer the guest cannot actually buy.
 *
 * @param {Array<object>} offers normalized offers for one hotel
 * @param {object} params
 * @param {boolean} [params.freeCancellationOnly]
 * @param {number} [params.minPrice] minimum average nightly price
 * @param {number} [params.maxPrice] maximum average nightly price
 * @returns {object|null}
 */
function selectOffer(offers, params = {}) {
  if (!Array.isArray(offers) || offers.length === 0) return null;

  const { freeCancellationOnly, minPrice, maxPrice } = params;

  const eligible = offers.filter((offer) => {
    if (freeCancellationOnly && !offer.has_free_cancellation) return false;

    if (offer.price_per_night === null || offer.price_per_night === undefined) return false;

    const perNight = Number(offer.price_per_night);
    if (!Number.isFinite(perNight)) return false;
    if (Number.isFinite(minPrice) && perNight < minPrice) return false;
    if (Number.isFinite(maxPrice) && perNight > maxPrice) return false;

    return true;
  });

  if (eligible.length === 0) return null;

  return [...eligible].sort(byPriceThenRoom)[0];
}

/**
 * Total bookable rooms for the stay across the hotel's eligible room types.
 * This is a per-night quantity (never a sum across dates).
 */
function sumAvailableRooms(offers) {
  return offers.reduce((total, offer) => total + (Number(offer.available_rooms) || 0), 0);
}

module.exports = {
  PRICE_SCALE,
  toMinorUnits,
  fromMinorUnits,
  normalizeOffer,
  selectOffer,
  sumAvailableRooms,
};
