/**
 * Pure row generator for the `booking_rooms` table.
 *
 * `bookings` alone is not enough for the app: `booking.repository.js` always
 * includes `BookingRooms` when loading a booking, and the checkout write path
 * (`createBookingFromHold`) creates one row per quoted room. Without them a
 * seeded booking renders with no rooms at all.
 *
 * Rows are derived from the already-seeded `bookings` table (streamed, never
 * accumulated) and mirror `quote.rooms[]` from `services/pricing.service.js`:
 * the nightly list is copied straight out of `bookings.price_breakdown`, so the
 * line item always agrees with the booking total.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'booking_rooms';

const COLUMNS = [
  'id',
  'booking_id',
  'room_id',
  'quantity',
  'nightly_price_snapshot',
  'subtotal',
  'total_price',
  'created_at',
  'updated_at',
];

/**
 * Statuses whose rooms are still held, i.e. the booking line item is meaningful.
 * Cancelled/expired bookings are skipped: the app releases the hold, so keeping
 * the line item would contradict `room_inventory.booked_rooms`.
 */
const INCLUDED_STATUSES = ['confirmed', 'completed', 'checked_in', 'no_show'];

function buildRow(booking, roomQuote) {
  const subtotal = Number.parseFloat(roomQuote.subtotal ?? roomQuote.totalPrice ?? 0) || 0;

  return {
    id: uuidv7(),
    booking_id: booking.id,
    room_id: roomQuote.roomId || booking.room_id,
    quantity: Number.parseInt(roomQuote.quantity ?? booking.quantity ?? 1, 10) || 1,
    nightly_price_snapshot: roomQuote.nightly ?? null,
    subtotal: subtotal.toFixed(2),
    total_price: subtotal.toFixed(2),
    created_at: booking.created_at,
    updated_at: booking.updated_at,
  };
}

function extractRoomQuotes(booking) {
  const breakdown = booking.price_breakdown;
  const rooms = Array.isArray(breakdown?.rooms) ? breakdown.rooms : null;

  if (rooms && rooms.length > 0) {
    return rooms;
  }

  // Fallback for bookings written before price_breakdown existed: synthesise a
  // single line item from the denormalised booking columns so the row is at
  // least consistent rather than missing.
  if (!booking.room_id) {
    return [];
  }

  const nights = Math.max(
    1,
    Math.round(
      (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) /
        86_400_000
    )
  );
  const quantity = Number.parseInt(booking.quantity ?? 1, 10) || 1;
  const subtotal = Number.parseFloat(booking.subtotal ?? booking.total_price ?? 0) || 0;

  return [
    {
      roomId: booking.room_id,
      quantity,
      nightly: null,
      subtotal,
      totalPrice: subtotal,
      nights,
    },
  ];
}

async function* createRows({ bookings }) {
  for await (const booking of bookings) {
    for (const roomQuote of extractRoomQuotes(booking)) {
      yield buildRow(booking, roomQuote);
    }
  }
}

module.exports = {
  COLUMNS,
  INCLUDED_STATUSES,
  TABLE,
  buildRow,
  createRows,
  extractRoomQuotes,
};
