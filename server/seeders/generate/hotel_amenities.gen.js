/**
 * Pure row generator for the `hotel_amenities` junction table.
 *
 * Each hotel is linked to a random distinct subset of hotel-applicable
 * amenities. `arrayElements` guarantees no duplicate (hotel, amenity) pair, so
 * the unique index can safely be rebuilt after the load.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'hotel_amenities';

const COLUMNS = [
  'id',
  'hotel_id',
  'amenity_id',
  'is_available',
  'is_free',
  'additional_info',
  'created_at',
  'updated_at',
];

const DEFAULT_MIN = 5;
const DEFAULT_MAX = 25;

const ADDITIONAL_INFO = [
  'Available 24/7',
  'Open 6am-10pm',
  'Charges may apply',
  'Subject to availability',
  null,
  null,
  null,
];

function buildRow(faker, hotelId, amenityId, createdAt) {
  return {
    id: uuidv7(),
    hotel_id: hotelId,
    amenity_id: amenityId,
    is_available: true,
    is_free: faker.datatype.boolean({ probability: 0.85 }),
    additional_info: faker.helpers.arrayElement(ADDITIONAL_INFO),
    created_at: createdAt,
    updated_at: createdAt,
  };
}

async function* createRows({
  faker,
  hotelIds,
  amenityIds,
  minPerHotel = DEFAULT_MIN,
  maxPerHotel = DEFAULT_MAX,
}) {
  if (amenityIds.length === 0) {
    return;
  }

  const min = Math.min(minPerHotel, amenityIds.length);
  const max = Math.min(maxPerHotel, amenityIds.length);

  for await (const hotelId of hotelIds) {
    const count = faker.number.int({ min, max });
    const selected = faker.helpers.arrayElements(amenityIds, count);
    const createdAt = faker.date.past({ years: 1 });

    for (const amenityId of selected) {
      yield buildRow(faker, hotelId, amenityId, createdAt);
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
