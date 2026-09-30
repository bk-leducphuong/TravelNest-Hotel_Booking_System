/**
 * Reusable fast-seed pipeline.
 *
 * Driven by the hybrid `seed-all` orchestrator. It owns the table registry,
 * parent-id manifest management and one runner per table. A single writer +
 * reader connection pair is shared for the whole run so manifests and streaming
 * parent queries stay warm.
 */

const bookingsGenerator = require('../generate/bookings.gen');
const hotelAmenitiesGenerator = require('../generate/hotel_amenities.gen');
const hotelCancellationRulesGenerator = require('../generate/hotel_cancellation_rules.gen');
const hotelPoliciesGenerator = require('../generate/hotel_policies.gen');
const hotelsGenerator = require('../generate/hotels.gen');
const nearbyPlacesGenerator = require('../generate/nearby_places.gen');
const notificationsGenerator = require('../generate/notifications.gen');
const reviewsGenerator = require('../generate/reviews.gen');
const roomAmenitiesGenerator = require('../generate/room_amenities.gen');
const roomInventoryGenerator = require('../generate/room_inventory.gen');
const roomsGenerator = require('../generate/rooms.gen');
const {
  applyBulkSession,
  createConnection,
  isLocalInfileEnabled,
  loadFiles,
  loadTable,
  streamColumn,
  streamQuery,
  truncateTables,
} = require('./bulk');
const { loadFaker } = require('./faker');
const { cleanupShards, generateShards } = require('./generator-pool');
const { createIdSampler, manifestExists, writeManifest } = require('./parent-index');
const { rebuildHotelSearchSnapshots } = require('./snapshots');

// Parent-id manifests required before a table's runner can sample ids.
const REQUIRED_MANIFESTS = {
  bookings: ['rooms', 'users'],
  reviews: ['users'],
  notifications: ['users'],
};

const MANIFEST_SOURCES = {
  users: { column: 'id', sql: 'SELECT `id` FROM `users`' },
  hotels: { column: 'id', sql: 'SELECT `id` FROM `hotels`' },
  rooms: { column: 'id', sql: 'SELECT `id` FROM `rooms`' },
};

/**
 * Read the amenity ids applicable to the given scope(s).
 */
async function fetchAmenityIds(reader, applicableTo) {
  const placeholders = applicableTo.map(() => '?').join(', ');
  const sql =
    'SELECT `id` FROM `amenities` ' +
    `WHERE \`is_active\` = 1 AND \`applicable_to\` IN (${placeholders})`;

  const ids = [];
  for await (const row of streamQuery(reader, sql, applicableTo)) {
    ids.push(row.id);
  }
  return ids;
}

async function ensureManifests(reader, tables, { refresh = false, log = console.log } = {}) {
  const needed = new Set();
  for (const table of tables) {
    for (const manifest of REQUIRED_MANIFESTS[table] || []) {
      needed.add(manifest);
    }
  }

  for (const manifest of needed) {
    if (!refresh && manifestExists(manifest)) {
      continue;
    }

    const source = MANIFEST_SOURCES[manifest];
    const { count } = await writeManifest(
      manifest,
      streamColumn(reader, source.sql, source.column)
    );
    log(`   📇 Wrote ${count} ${manifest} id(s) to ${manifest}.ids`);
  }
}

async function runHotels({ writer, reader, faker, useLoadData }, options) {
  const locations = await getSeedLocations(reader, options.countryIsoCode);
  if (locations.length === 0) {
    throw new Error('No cities found. Seed countries and cities before hotels.');
  }

  const hotelsPerCity = options.hotelsPerCity ?? 200;
  const total = options.count ?? locations.length * hotelsPerCity;
  console.log(`   🏨 Generating ${total} hotel(s) across ${locations.length} city(ies)`);

  const columns = hotelsGenerator.COLUMNS;
  const shards = Number(options.shards) || 1;

  if (shards > 1 && useLoadData) {
    const { files, dir } = await generateShards({
      generatorPath: require.resolve('../generate/hotels.gen'),
      table: hotelsGenerator.TABLE,
      columns,
      context: { locations },
      total,
      shards,
      concurrency: options.shardConcurrency,
    });

    try {
      return await loadFiles(writer, {
        table: hotelsGenerator.TABLE,
        columns,
        files,
        manageIndexes: !options.keepIndexes,
      });
    } finally {
      cleanupShards(dir);
    }
  }

  return loadTable(writer, {
    table: hotelsGenerator.TABLE,
    columns,
    rows: hotelsGenerator.createRows({ faker, count: total, locations }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runRooms({ writer, reader, faker }, options) {
  const roomsPerHotel = options.roomsPerHotel ?? roomsGenerator.DEFAULT_ROOMS_PER_HOTEL;
  const hotelIds = streamColumn(reader, 'SELECT `id` FROM `hotels`', 'id');

  return loadTable(writer, {
    table: roomsGenerator.TABLE,
    columns: roomsGenerator.COLUMNS,
    rows: roomsGenerator.createRows({ faker, hotelIds, roomsPerHotel }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runRoomInventory({ writer, reader, faker }, options) {
  const rooms = streamQuery(reader, 'SELECT `id`, `quantity` FROM `rooms`', []);
  const rows = roomInventoryGenerator.createRows({
    faker,
    rooms,
    daysAhead: options.daysAhead ?? 90,
    priceMin: options.priceMin ?? 80,
    priceMax: options.priceMax ?? 350,
    currency: options.currency ?? 'USD',
  });

  return loadTable(writer, {
    table: roomInventoryGenerator.TABLE,
    columns: roomInventoryGenerator.COLUMNS,
    rows,
    manageIndexes: !options.keepIndexes,
  });
}

async function runHotelPolicies({ writer, reader, faker }, options) {
  const hotelIds = streamColumn(reader, 'SELECT `id` FROM `hotels`', 'id');

  return loadTable(writer, {
    table: hotelPoliciesGenerator.TABLE,
    columns: hotelPoliciesGenerator.COLUMNS,
    rows: hotelPoliciesGenerator.createRows({ faker, hotelIds }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runHotelCancellationRules({ writer, reader, faker }, options) {
  const hotelIds = streamColumn(reader, 'SELECT `id` FROM `hotels`', 'id');

  return loadTable(writer, {
    table: hotelCancellationRulesGenerator.TABLE,
    columns: hotelCancellationRulesGenerator.COLUMNS,
    rows: hotelCancellationRulesGenerator.createRows({ faker, hotelIds }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runNearbyPlaces({ writer, reader, faker }, options) {
  const hotels = streamQuery(reader, 'SELECT `id`, `latitude`, `longitude` FROM `hotels`', []);

  return loadTable(writer, {
    table: nearbyPlacesGenerator.TABLE,
    columns: nearbyPlacesGenerator.COLUMNS,
    rows: nearbyPlacesGenerator.createRows({
      faker,
      hotels,
      placesPerHotel: options.placesPerHotel,
    }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runHotelAmenities({ writer, reader, faker }, options) {
  const [amenityIds, hotelIds] = await Promise.all([
    fetchAmenityIds(reader, ['hotel', 'both']),
    Promise.resolve(streamColumn(reader, 'SELECT `id` FROM `hotels`', 'id')),
  ]);

  if (amenityIds.length === 0) {
    console.log('   ⚠️  No hotel-applicable amenities found — skipping');
    return { table: hotelAmenitiesGenerator.TABLE, affectedRows: 0, ms: 0 };
  }

  return loadTable(writer, {
    table: hotelAmenitiesGenerator.TABLE,
    columns: hotelAmenitiesGenerator.COLUMNS,
    rows: hotelAmenitiesGenerator.createRows({
      faker,
      hotelIds,
      amenityIds,
      minPerHotel: options.minAmenitiesPerHotel ?? hotelAmenitiesGenerator.DEFAULT_MIN,
      maxPerHotel: options.maxAmenitiesPerHotel ?? hotelAmenitiesGenerator.DEFAULT_MAX,
    }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runRoomAmenities({ writer, reader, faker }, options) {
  const [amenityIds, roomIds] = await Promise.all([
    fetchAmenityIds(reader, ['room', 'both']),
    Promise.resolve(streamColumn(reader, 'SELECT `id` FROM `rooms`', 'id')),
  ]);

  if (amenityIds.length === 0) {
    console.log('   ⚠️  No room-applicable amenities found — skipping');
    return { table: roomAmenitiesGenerator.TABLE, affectedRows: 0, ms: 0 };
  }

  return loadTable(writer, {
    table: roomAmenitiesGenerator.TABLE,
    columns: roomAmenitiesGenerator.COLUMNS,
    rows: roomAmenitiesGenerator.createRows({
      faker,
      roomIds,
      amenityIds,
      minPerRoom: options.minAmenitiesPerRoom ?? roomAmenitiesGenerator.DEFAULT_MIN,
      maxPerRoom: options.maxAmenitiesPerRoom ?? roomAmenitiesGenerator.DEFAULT_MAX,
    }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runBookings({ writer, reader, faker }, options) {
  const [userSampler, roomSampler] = await Promise.all([
    createIdSampler('users'),
    createIdSampler('rooms'),
  ]);

  if (userSampler.size === 0) {
    throw new Error('No users found. Seed users before bookings.');
  }
  if (roomSampler.size === 0) {
    throw new Error('No rooms found. Seed rooms before bookings.');
  }

  const bookingCodePrefix = `BK${Date.now().toString(36).toUpperCase()}${faker.string
    .alphanumeric(4)
    .toUpperCase()}`;
  const hotelIds = streamColumn(reader, 'SELECT `id` FROM `hotels`', 'id');

  return loadTable(writer, {
    table: bookingsGenerator.TABLE,
    columns: bookingsGenerator.COLUMNS,
    rows: bookingsGenerator.createRows({
      faker,
      hotelIds,
      roomSampler,
      userSampler,
      bookingCodePrefix,
      bookingsPerHotel: options.bookingsPerHotel,
    }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runReviews({ writer, reader, faker }, options) {
  const userSampler = await createIdSampler('users');
  if (userSampler.size === 0) {
    throw new Error('No users found. Seed users before reviews.');
  }

  const hotelIds = streamColumn(reader, 'SELECT `id` FROM `hotels`', 'id');

  return loadTable(writer, {
    table: reviewsGenerator.TABLE,
    columns: reviewsGenerator.COLUMNS,
    rows: reviewsGenerator.createRows({
      faker,
      hotelIds,
      userSampler,
      reviewsPerHotel: options.reviewsPerHotel,
    }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runNotifications({ writer, reader, faker }, options) {
  const userSampler = await createIdSampler('users');
  if (userSampler.size === 0) {
    throw new Error('No users found. Seed users before notifications.');
  }

  const userIds = streamColumn(reader, 'SELECT `id` FROM `users`', 'id');

  return loadTable(writer, {
    table: notificationsGenerator.TABLE,
    columns: notificationsGenerator.COLUMNS,
    rows: notificationsGenerator.createRows({
      faker,
      userIds,
      userSampler,
      notificationsPerUser: options.notificationsPerUser,
    }),
    manageIndexes: !options.keepIndexes,
  });
}

async function runSnapshots({ writer }, options) {
  return rebuildHotelSearchSnapshots(writer, {
    clear: true,
    manageIndexes: !options.keepIndexes,
  });
}

const RUNNERS = {
  bookings: runBookings,
  hotel_amenities: runHotelAmenities,
  hotel_cancellation_rules: runHotelCancellationRules,
  hotel_policies: runHotelPolicies,
  hotel_search_snapshots: runSnapshots,
  hotels: runHotels,
  nearby_places: runNearbyPlaces,
  notifications: runNotifications,
  reviews: runReviews,
  room_amenities: runRoomAmenities,
  room_inventory: runRoomInventory,
  rooms: runRooms,
};

async function getSeedLocations(reader, countryIsoCode) {
  const sql = countryIsoCode
    ? `SELECT c.id AS cityId, c.name AS cityName, c.country_id AS countryId,
              c.latitude AS latitude, c.longitude AS longitude
       FROM cities c
       JOIN countries co ON co.id = c.country_id
       WHERE co.iso_code = ?
       ORDER BY c.name ASC`
    : `SELECT c.id AS cityId, c.name AS cityName, c.country_id AS countryId,
              c.latitude AS latitude, c.longitude AS longitude
       FROM cities c
       ORDER BY c.name ASC`;

  const params = countryIsoCode ? [countryIsoCode] : [];
  const locations = [];
  for await (const row of streamQuery(reader, sql, params)) {
    locations.push(row);
  }
  return locations;
}

/**
 * Open the shared writer/reader connection pair and load faker once.
 */
async function createFastContext({ log = console.log } = {}) {
  const writer = await createConnection();
  const reader = await createConnection({ admin: false });
  const faker = await loadFaker();

  await applyBulkSession(writer, { log });

  const useLoadData = await isLocalInfileEnabled(writer);
  if (!useLoadData) {
    log('⚠️  local_infile is OFF — falling back to batched INSERTs');
  }

  return {
    writer,
    reader,
    faker,
    useLoadData,
    async close() {
      await writer.end().catch(() => {});
      await reader.end().catch(() => {});
    },
  };
}

/**
 * Run a single fast table. When `options.clear` is set, truncate just that table.
 */
async function runFastTable(ctx, table, options = {}) {
  const runner = RUNNERS[table];
  if (!runner) {
    throw new Error(`No fast generator registered for "${table}"`);
  }

  if (options.clear) {
    await truncateTables(ctx.writer, [table]);
  }

  return runner(ctx, options);
}

module.exports = {
  MANIFEST_SOURCES,
  REQUIRED_MANIFESTS,
  RUNNERS,
  createFastContext,
  ensureManifests,
  fetchAmenityIds,
  runFastTable,
};
