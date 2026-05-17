require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});
let faker;
async function loadFaker() {
  if (!faker) {
    const mod = await import('@faker-js/faker');
    faker = mod.faker ?? mod.default ?? mod;
  }
}
const db = require('../../../models');
const sequelize = require('../../../config/database.config');
const {
  IANA_TIMEZONES,
  HOTEL_CHECK_IN_POLICIES,
  HOTEL_CHECK_OUT_POLICIES,
} = require('../../../constants/hotels');
const { hotels: Hotels, cities: Cities, countries: Countries } = db;

const DEFAULT_HOTELS_PER_CITY = 200;
const DEFAULT_BATCH_SIZE = 500;
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

/**
 * Generate a hotel-style name
 * @returns {string}
 */
function toDecimalString(value) {
  return String(Number(value).toFixed(7));
}

function jitterCoordinate(value, min, max) {
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

async function generateHotelName(cityName = null) {
  const prefix = faker.helpers.arrayElement(HOTEL_NAME_PREFIXES);
  const suffix = faker.helpers.arrayElement(HOTEL_NAME_SUFFIXES);
  const middle = faker.helpers.arrayElement(
    [cityName, faker.location.street(), faker.person.firstName(), ''].filter(
      (item) => item !== null && item !== undefined
    )
  );
  if (prefix === 'The' || (prefix === 'Boutique' && middle)) {
    return middle ? `${prefix} ${middle} ${suffix}` : `${prefix} ${suffix}`;
  }
  return middle ? `${prefix} ${middle} ${suffix}`.trim() : `${prefix} ${suffix}`;
}

/**
 * Generate a single hotel record (no id; Sequelize will set it)
 * @returns {Object}
 */
async function generateHotelRecord(location = null) {
  const latitude = location
    ? jitterCoordinate(location.latitude, -90, 90)
    : faker.location.latitude();
  const longitude = location
    ? jitterCoordinate(location.longitude, -180, 180)
    : faker.location.longitude();
  const hotelClass = faker.helpers.arrayElement([1, 2, 3, 4, 5]);
  const minPrice = faker.number.float({
    min: 50,
    max: 800,
    fractionDigits: 2,
  });

  return {
    name: await generateHotelName(location?.cityName),
    description: faker.lorem.paragraphs(2, '\n'),
    address: faker.location.streetAddress({ useFullAddress: true }),
    city_id: location?.cityId ?? null,
    country_id: location?.countryId ?? null,
    phone_number: faker.phone.number(),
    latitude: toDecimalString(latitude),
    longitude: toDecimalString(longitude),
    hotel_class: hotelClass,
    check_in_time: '14:00:00',
    check_out_time: '12:00:00',
    check_in_policy: faker.helpers.arrayElement(HOTEL_CHECK_IN_POLICIES) ?? null,
    check_out_policy: faker.helpers.arrayElement(HOTEL_CHECK_OUT_POLICIES) ?? null,
    min_price: String(minPrice),
    status: 'active',
    timezone: faker.helpers.arrayElement(IANA_TIMEZONES),
  };
}

async function getSeedLocations(countryIsoCode = null) {
  const countryWhere = countryIsoCode ? { iso_code: countryIsoCode } : {};
  const countries = await Countries.findAll({
    where: countryWhere,
    attributes: ['id', 'name', 'iso_code'],
    raw: true,
  });

  if (countries.length === 0) {
    const suffix = countryIsoCode ? ` with iso_code='${countryIsoCode}'` : '';
    throw new Error(`No countries${suffix} found. Run the country seeder first.`);
  }

  const countryIds = countries.map((country) => country.id);
  const countriesById = new Map(countries.map((country) => [country.id, country]));
  const cities = await Cities.findAll({
    where: { country_id: countryIds },
    attributes: ['id', 'name', 'country_id', 'latitude', 'longitude'],
    order: [['name', 'ASC']],
    raw: true,
  });

  if (cities.length === 0) {
    throw new Error('No cities found. Run the city seeder before seeding hotels.');
  }

  return cities.map((city) => {
    const country = countriesById.get(city.country_id);

    return {
      cityId: city.id,
      cityName: city.name,
      countryId: city.country_id,
      countryName: country?.name ?? null,
      countryIsoCode: country?.iso_code ?? null,
      latitude: city.latitude,
      longitude: city.longitude,
    };
  });
}

function getTotalHotelsToCreate({ locations, hotelsPerCity, count }) {
  if (Number.isInteger(count) && count > 0) {
    return count;
  }

  return locations.length * hotelsPerCity;
}

/**
 * Seed hotels into the database
 * @param {Object} options - Seeding options
 * @param {number} options.hotelsPerCity - Number of hotels to create for each city (default: 200)
 * @param {number} options.count - Legacy total number of hotels to create, distributed across cities
 * @param {boolean} options.clearExisting - Whether to delete existing hotels first (default: false)
 * @param {number} options.batchSize - Number of hotels to insert per bulkCreate call (default: 500)
 * @param {string|null} options.countryIsoCode - Optional country ISO filter (default: all countries)
 * @returns {Promise<{ created: number }>}
 */
async function seedHotels(options = {}) {
  await loadFaker();
  const {
    count = null,
    hotelsPerCity = Number.isInteger(count) && count > 0 ? null : DEFAULT_HOTELS_PER_CITY,
    clearExisting = false,
    batchSize = DEFAULT_BATCH_SIZE,
    countryIsoCode = null,
  } = options;

  try {
    console.log('🌱 Starting hotel seeding...');
    const locations = await getSeedLocations(countryIsoCode);
    const totalToCreate = getTotalHotelsToCreate({ locations, hotelsPerCity, count });
    const mode =
      Number.isInteger(count) && count > 0 ? `${count} total` : `${hotelsPerCity} per city`;

    console.log(`📍 Found ${locations.length} city location(s) for hotel seeding`);
    console.log(`🏨 Target hotel count: ${totalToCreate} (${mode})`);

    if (clearExisting) {
      console.log('🗑️  Clearing existing hotels...');
      const deleted = await Hotels.destroy({ where: {} });
      console.log(`✅ Deleted ${deleted} existing hotel(s)`);
    }

    let created = 0;
    let batch = [];

    for (let i = 0; i < totalToCreate; i++) {
      const location = locations[i % locations.length];
      const record = await generateHotelRecord(location);
      batch.push(record);

      if (batch.length >= batchSize) {
        await Hotels.bulkCreate(batch);
        created += batch.length;
        batch = [];
        console.log(`📊 Created ${created}/${totalToCreate} hotels`);
      }
    }

    if (batch.length > 0) {
      await Hotels.bulkCreate(batch);
      created += batch.length;
    }

    console.log(`✅ Created ${created} hotels`);
    console.log(`🎉 Total hotels in database: ${await Hotels.count()}`);

    return { created };
  } catch (error) {
    console.error('❌ Error seeding hotels:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedHotels({
        hotelsPerCity: DEFAULT_HOTELS_PER_CITY,
        clearExisting: false,
      });

      await db.sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedHotels,
  generateHotelRecord,
  generateHotelName,
  getSeedLocations,
};
