/**
 * Pure row generator for the `room_amenities` junction table.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'room_amenities';

const COLUMNS = [
  'id',
  'room_id',
  'amenity_id',
  'is_available',
  'additional_info',
  'created_at',
  'updated_at',
];

const DEFAULT_MIN = 3;
const DEFAULT_MAX = 12;

const ADDITIONAL_INFO = [
  'King size bed',
  'Queen size bed',
  'In-room',
  'Upon request',
  null,
  null,
  null,
];

function buildRow(faker, roomId, amenityId, createdAt) {
  return {
    id: uuidv7(),
    room_id: roomId,
    amenity_id: amenityId,
    is_available: true,
    additional_info: faker.helpers.arrayElement(ADDITIONAL_INFO),
    created_at: createdAt,
    updated_at: createdAt,
  };
}

async function* createRows({
  faker,
  roomIds,
  amenityIds,
  minPerRoom = DEFAULT_MIN,
  maxPerRoom = DEFAULT_MAX,
}) {
  if (amenityIds.length === 0) {
    return;
  }

  const min = Math.min(minPerRoom, amenityIds.length);
  const max = Math.min(maxPerRoom, amenityIds.length);

  for await (const roomId of roomIds) {
    const count = faker.number.int({ min, max });
    const selected = faker.helpers.arrayElements(amenityIds, count);
    const createdAt = faker.date.past({ years: 1 });

    for (const amenityId of selected) {
      yield buildRow(faker, roomId, amenityId, createdAt);
    }
  }
}

module.exports = {
  COLUMNS,
  DEFAULT_MAX,
  DEFAULT_MIN,
  TABLE,
  buildRow,
  createRows,
};
