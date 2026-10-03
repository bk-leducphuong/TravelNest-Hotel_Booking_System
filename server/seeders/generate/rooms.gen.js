/**
 * Pure row generator for the `rooms` table.
 *
 * Consumes an async iterable of hotel ids (streamed from the DB) so the whole
 * table can be generated and loaded without materialising the hotel list in
 * memory.
 */

const { uuidv7 } = require('uuidv7');

const { ROOM_TYPES } = require('../../constants/rooms');

const TABLE = 'rooms';

const COLUMNS = [
  'id',
  'hotel_id',
  'room_name',
  'max_guests',
  'room_size',
  'room_type',
  'quantity',
  'status',
  'created_at',
  'updated_at',
];

const DEFAULT_ROOMS_PER_HOTEL = { min: 3, max: 8 };

function roomTypeDisplayName(roomType) {
  return roomType.charAt(0).toUpperCase() + roomType.slice(1);
}

function buildRow(faker, hotelId, createdAt) {
  const roomType = faker.helpers.arrayElement(ROOM_TYPES);

  return {
    id: uuidv7(),
    hotel_id: hotelId,
    room_name: `${roomTypeDisplayName(roomType)} ${faker.number.int({ min: 100, max: 999 })}`,
    max_guests: faker.helpers.arrayElement([1, 2, 3, 4, 5, 6]),
    room_size: faker.number.int({ min: 15, max: 100 }),
    room_type: roomType,
    quantity: faker.number.int({ min: 1, max: 10 }),
    status: 'active',
    created_at: createdAt,
    updated_at: createdAt,
  };
}

/**
 * Yield rooms for each hotel id.
 * @param {{ faker: Object, hotelIds: AsyncIterable<string>,
 *   roomsPerHotel?: {min:number,max:number} }} context
 */
async function* createRows({ faker, hotelIds, roomsPerHotel = DEFAULT_ROOMS_PER_HOTEL }) {
  const min = roomsPerHotel.min ?? DEFAULT_ROOMS_PER_HOTEL.min;
  const max = roomsPerHotel.max ?? DEFAULT_ROOMS_PER_HOTEL.max;

  for await (const hotelId of hotelIds) {
    const count = faker.number.int({ min, max });
    const createdAt = faker.date.past({ years: 1 });

    for (let i = 0; i < count; i++) {
      yield buildRow(faker, hotelId, createdAt);
    }
  }
}

module.exports = {
  COLUMNS,
  DEFAULT_ROOMS_PER_HOTEL,
  TABLE,
  buildRow,
  createRows,
};
