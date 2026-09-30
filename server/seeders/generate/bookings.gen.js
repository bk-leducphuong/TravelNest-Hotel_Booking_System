/**
 * Pure row generator for the `bookings` table.
 *
 * Iterates hotels sequentially and, per hotel, samples a buyer and a room from
 * id samplers. Only columns that are NOT NULL without a default are emitted;
 * everything else relies on the table default. `booking_code` is derived from a
 * passed-in prefix plus a counter so it is guaranteed unique (required when the
 * unique index is rebuilt after the load).
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'bookings';

const COLUMNS = [
  'id',
  'buyer_id',
  'hotel_id',
  'room_id',
  'booking_code',
  'check_in_date',
  'check_out_date',
  'number_of_guests',
  'quantity',
  'total_price',
  'status',
  'created_at',
  'updated_at',
];

const DEFAULT_BOOKINGS_PER_HOTEL = { min: 20, max: 50 };

const STATUS_WEIGHTS = [
  { status: 'completed', weight: 40 },
  { status: 'confirmed', weight: 30 },
  { status: 'checked_in', weight: 5 },
  { status: 'cancelled', weight: 20 },
  { status: 'no_show', weight: 5 },
];

const TOTAL_WEIGHT = STATUS_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function pickStatus() {
  let random = Math.floor(Math.random() * TOTAL_WEIGHT) + 1;
  for (const item of STATUS_WEIGHTS) {
    random -= item.weight;
    if (random <= 0) {
      return item.status;
    }
  }
  return 'confirmed';
}

function buildRow(faker, { buyerId, hotelId, roomId, bookingCode, minDate, maxDate }) {
  const checkIn = faker.date.between({ from: minDate, to: maxDate });
  const nights = faker.number.int({ min: 1, max: 14 });
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + nights);

  const quantity = faker.number.int({ min: 1, max: 3 });
  const pricePerNight = faker.number.float({ min: 50, max: 500, fractionDigits: 2 });
  const variation = faker.number.float({ min: 0.9, max: 1.1 });
  const totalPrice = (pricePerNight * nights * quantity * variation).toFixed(2);
  const createdAt = faker.date.past({ years: 1 });

  return {
    id: uuidv7(),
    buyer_id: buyerId,
    hotel_id: hotelId,
    room_id: roomId,
    booking_code: bookingCode,
    check_in_date: isoDate(checkIn),
    check_out_date: isoDate(checkOut),
    number_of_guests: faker.number.int({ min: 1, max: 4 }),
    quantity,
    total_price: totalPrice,
    status: pickStatus(),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }),
  };
}

async function* createRows({
  faker,
  hotelIds,
  roomSampler,
  userSampler,
  bookingCodePrefix,
  bookingsPerHotel = DEFAULT_BOOKINGS_PER_HOTEL,
}) {
  const min = bookingsPerHotel.min ?? DEFAULT_BOOKINGS_PER_HOTEL.min;
  const max = bookingsPerHotel.max ?? DEFAULT_BOOKINGS_PER_HOTEL.max;

  const maxDate = new Date();
  maxDate.setUTCMonth(maxDate.getUTCMonth() + 3);
  const minDate = new Date();
  minDate.setUTCMonth(minDate.getUTCMonth() - 6);

  let counter = 0;

  for await (const hotelId of hotelIds) {
    const count = faker.number.int({ min, max });

    for (let i = 0; i < count; i++) {
      counter += 1;
      yield buildRow(faker, {
        buyerId: userSampler.random(),
        hotelId,
        roomId: roomSampler.random(),
        bookingCode: `${bookingCodePrefix}${counter}`,
        minDate,
        maxDate,
      });
    }
  }
}

module.exports = {
  COLUMNS,
  DEFAULT_BOOKINGS_PER_HOTEL,
  TABLE,
  buildRow,
  createRows,
};
