/**
 * Pure row generator for the `hotels` table.
 *
 * No DB access and no per-row `await`: the orchestrator supplies the city
 * locations and the target count, and this yields ready-to-serialize objects in
 * the exact column order of `hotels`.
 */

const { uuidv7 } = require('uuidv7');

const {
  HOTEL_CHECK_IN_POLICIES,
  HOTEL_CHECK_OUT_POLICIES,
  IANA_TIMEZONES,
} = require('../../constants/hotels');

const TABLE = 'hotels';

const COLUMNS = [
  'id',
  'name',
  'description',
  'address',
  'city_id',
  'country_id',
  'phone_number',
  'latitude',
  'longitude',
  'hotel_class',
  'check_in_time',
  'check_out_time',
  'check_in_policy',
  'check_out_policy',
  'min_price',
  'status',
  'timezone',
  'created_at',
  'updated_at',
];

const COORDINATE_JITTER = 0.12;

const HOTEL_NAME_PREFIXES = [
  'Grand',
  'Royal',
  'Plaza',
  'Palace',
  'Resort',
  'Inn',
  'Lodge',
  'Suites',
  'Boutique',
  'The',
  'Hotel',
  'View',
  'Sunset',
  'Ocean',
  'Mountain',
  'City',
  'Park',
  'Garden',
  'Riverside',
  'Lakeside',
];

const HOTEL_NAME_SUFFIXES = [
  'Hotel',
  'Resort',
  'Inn',
  'Suites',
  'Lodge',
  'Plaza',
  'House',
  'Court',
  'Manor',
  'Tower',
  'Place',
  'Club',
];

function toDecimalString(value) {
  return String(Number(value).toFixed(7));
}

function jitterCoordinate(faker, value, min, max) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return faker.number.float({ min, max, fractionDigits: 7 });
  }

  const jittered = faker.number.float({
    min: numericValue - COORDINATE_JITTER,
    max: numericValue + COORDINATE_JITTER,
    fractionDigits: 7,
  });

  return Math.min(max, Math.max(min, jittered));
}

function buildName(faker, cityName) {
  const prefix = faker.helpers.arrayElement(HOTEL_NAME_PREFIXES);
  const suffix = faker.helpers.arrayElement(HOTEL_NAME_SUFFIXES);
  const candidates = [cityName, faker.location.street(), faker.person.firstName(), ''].filter(
    (item) => item !== null && item !== undefined
  );
  const middle = faker.helpers.arrayElement(candidates);

  if (prefix === 'The' || (prefix === 'Boutique' && middle)) {
    return middle ? `${prefix} ${middle} ${suffix}` : `${prefix} ${suffix}`;
  }
  return middle ? `${prefix} ${middle} ${suffix}`.trim() : `${prefix} ${suffix}`;
}

/**
 * Build a single hotel row from a seed location.
 * @param {Object} faker
 * @param {{ cityId: string, cityName: string, countryId: string, latitude: *, longitude: * }}
 *   location
 */
function buildRow(faker, location) {
  const latitude = location
    ? jitterCoordinate(faker, location.latitude, -90, 90)
    : faker.location.latitude();
  const longitude = location
    ? jitterCoordinate(faker, location.longitude, -180, 180)
    : faker.location.longitude();

  const createdAt = faker.date.past({ years: 1 });

  return {
    id: uuidv7(),
    name: buildName(faker, location?.cityName),
    description: faker.lorem.paragraphs(2, ' '),
    address: faker.location.streetAddress({ useFullAddress: true }),
    city_id: location?.cityId ?? null,
    country_id: location?.countryId ?? null,
    phone_number: faker.phone.number(),
    latitude: toDecimalString(latitude),
    longitude: toDecimalString(longitude),
    hotel_class: faker.helpers.arrayElement([1, 2, 3, 4, 5]),
    check_in_time: '14:00:00',
    check_out_time: '12:00:00',
    check_in_policy: faker.helpers.arrayElement(HOTEL_CHECK_IN_POLICIES) ?? null,
    check_out_policy: faker.helpers.arrayElement(HOTEL_CHECK_OUT_POLICIES) ?? null,
    min_price: String(faker.number.float({ min: 50, max: 800, fractionDigits: 2 })),
    status: 'active',
    timezone: faker.helpers.arrayElement(IANA_TIMEZONES),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }),
  };
}

/**
 * Yield `count` hotels, distributing them round-robin across `locations`.
 * `start` allows sharded generation.
 */
function* createRows({ faker, count, locations, start = 0 }) {
  const total = locations.length;

  for (let i = 0; i < count; i++) {
    yield buildRow(faker, locations[(start + i) % total]);
  }
}

module.exports = {
  COLUMNS,
  TABLE,
  buildName,
  buildRow,
  createRows,
};
