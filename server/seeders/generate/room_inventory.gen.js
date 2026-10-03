/**
 * Pure row generator for the `room_inventory` table.
 *
 * This is usually the largest table (rooms x days). Consumes an async iterable
 * of `{ id, quantity }` room rows so generation stays streaming. The date list
 * is computed once per run rather than per row.
 */

const TABLE = 'room_inventory';

const COLUMNS = [
  'room_id',
  'date',
  'total_rooms',
  'booked_rooms',
  'held_rooms',
  'status',
  'price_per_night',
  'currency',
  'created_at',
  'updated_at',
];

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Build the inclusive list of `YYYY-MM-DD` strings starting at `startDate`.
 * @param {Date} startDate
 * @param {number} daysAhead
 */
function buildDates(startDate, daysAhead) {
  const dates = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < daysAhead; i++) {
    dates.push(toDateOnly(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Yield one inventory row per room per day.
 * @param {Object} context
 * @param {Object} context.faker
 * @param {AsyncIterable<{id: string, quantity: *}>} context.rooms
 * @param {number} [context.daysAhead]
 * @param {number} [context.priceMin]
 * @param {number} [context.priceMax]
 * @param {string} [context.currency]
 * @param {Date} [context.startDate]
 */
async function* createRows({
  faker,
  rooms,
  daysAhead = 90,
  priceMin = 80,
  priceMax = 350,
  currency = 'USD',
  startDate = new Date(),
}) {
  const dates = buildDates(startDate, daysAhead);
  const now = new Date();

  for await (const room of rooms) {
    const quantity = Math.max(1, Number(room.quantity) || 1);

    for (const date of dates) {
      yield {
        room_id: room.id,
        date,
        total_rooms: quantity,
        booked_rooms: 0,
        held_rooms: 0,
        status: 'open',
        price_per_night: String(
          faker.number.float({ min: priceMin, max: priceMax, fractionDigits: 2 })
        ),
        currency,
        created_at: now,
        updated_at: now,
      };
    }
  }
}

module.exports = {
  COLUMNS,
  TABLE,
  buildDates,
  createRows,
  toDateOnly,
};
