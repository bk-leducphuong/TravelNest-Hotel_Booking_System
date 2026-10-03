/**
 * Reusable fast-seed pipeline.
 *
 * Driven by the hybrid `seed-all` orchestrator. It owns the table registry,
 * parent-id manifest management and one runner per table. A single writer +
 * reader connection pair is shared for the whole run so manifests and streaming
 * parent queries stay warm.
 */

const bookingRoomsGenerator = require('../generate/booking_rooms.gen');
const bookingsGenerator = require('../generate/bookings.gen');
const hotelAmenitiesGenerator = require('../generate/hotel_amenities.gen');
const hotelCancellationRulesGenerator = require('../generate/hotel_cancellation_rules.gen');
const hotelPoliciesGenerator = require('../generate/hotel_policies.gen');
const hotelsGenerator = require('../generate/hotels.gen');
const invoicesGenerator = require('../generate/invoices.gen');
const nearbyPlacesGenerator = require('../generate/nearby_places.gen');
const notificationsGenerator = require('../generate/notifications.gen');
const paymentsGenerator = require('../generate/payments.gen');
const reviewHelpfulVotesGenerator = require('../generate/review_helpful_votes.gen');
const reviewMediaGenerator = require('../generate/review_media.gen');
const reviewRepliesGenerator = require('../generate/review_replies.gen');
const reviewsGenerator = require('../generate/reviews.gen');
const roomAmenitiesGenerator = require('../generate/room_amenities.gen');
const roomInventoryGenerator = require('../generate/room_inventory.gen');
const roomsGenerator = require('../generate/rooms.gen');
const savedHotelsGenerator = require('../generate/saved_hotels.gen');
const transactionsGenerator = require('../generate/transactions.gen');
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
const { backfillBookedRooms } = require('./booked-rooms');
const { syncHelpfulCounts } = require('./helpful-counts');
const { loadFaker } = require('./faker');
const { cleanupShards, generateShards } = require('./generator-pool');
const { createIdSampler, manifestExists, writeManifest } = require('./parent-index');
const { rebuildHotelRatingSummaries } = require('./rating-summaries');
const { rebuildHotelSearchSnapshots } = require('./snapshots');

// Parent-id manifests required before a table's runner can sample ids.
const REQUIRED_MANIFESTS = {
  bookings: ['rooms', 'users'],
  booking_rooms: [],
  invoices: [],
  notifications: ['users'],
  payments: [],
  refund: ['users'],
  review_helpful_votes: ['users'],
  review_media: [],
  review_replies: ['hotel_staff'],
  reviews: ['users'],
  saved_hotels: ['hotels'],
  transactions: [],
};

const MANIFEST_SOURCES = {
  users: { column: 'id', sql: 'SELECT `id` FROM `users`' },
  hotels: { column: 'id', sql: 'SELECT `id` FROM `hotels`' },
  rooms: { column: 'id', sql: 'SELECT `id` FROM `rooms`' },
  // Owner/manager accounts created by the Admin & Hotel Staff step. Used as the
  // authors of `review_replies` so replies are attributed to staff, not guests.
  hotel_staff: {
    column: 'user_id',
    sql: 'SELECT DISTINCT `user_id` FROM `hotel_users`',
  },
};

/** Columns streamed from a parent table for a child generator. */
const CHILD_SOURCES = {
  bookings: {
    sql:
      'SELECT `id`, `buyer_id`, `hotel_id`, `room_id`, `booking_code`, `check_in_date`, ' +
      '`check_out_date`, `number_of_guests`, `quantity`, `subtotal`, `tax_amount`, ' +
      '`service_fee_amount`, `platform_commission_amount`, `total_price`, `currency`, ' +
      '`price_breakdown`, `status`, `created_at`, `updated_at` FROM `bookings` ORDER BY `id`',
  },
  transactions: {
    sql:
      'SELECT `id`, `booking_id`, `buyer_id`, `hotel_id`, `amount`, `currency`, `status`, ' +
      '`transaction_type`, `payment_method`, `completed_at`, `metadata`, `created_at`, ' +
      '`updated_at` FROM `transactions` ORDER BY `id`',
  },
  published_reviews: {
    sql:
      'SELECT `id`, `hotel_id`, `status`, `created_at`, `updated_at` FROM `reviews` ' +
      "WHERE `status` = 'published' ORDER BY `id`",
  },
  /**
   * Reviews plus one of the hotel's active image keys, used as the guest photo
   * URL. Correlated subquery rather than a join so it stays a single streaming
   * query with one row per review.
   */
  reviews_with_media: {
    sql:
      'SELECT r.`id`, r.`hotel_id`, r.`status`, r.`created_at`, r.`updated_at`, ' +
      '(SELECT i.`object_key` FROM `images` i ' +
      "WHERE i.`entity_type` = 'hotel' AND i.`entity_id` = r.`hotel_id` " +
      "AND i.`status` = 'active' ORDER BY i.`id` LIMIT 1) AS `image_url` " +
      'FROM `reviews` r ORDER BY r.`id`',
  },
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

/**
 * `booking_rooms` line items, derived from the bookings just written.
 *
 * `booking.repository.js` always includes this table when loading a booking, so
 * an empty table renders bookings with no rooms at all.
 */
async function runBookingRooms({ writer, reader, faker }, options) {
  const bookings = streamQuery(reader, CHILD_SOURCES.bookings.sql, []);

  return loadTable(writer, {
    table: bookingRoomsGenerator.TABLE,
    columns: bookingRoomsGenerator.COLUMNS,
    rows: bookingRoomsGenerator.createRows({ faker, bookings }),
    manageIndexes: !options.keepIndexes,
  });
}

/**
 * `transactions` derived from bookings (one per booking, as checkout writes it).
 */
async function runTransactions({ writer, reader, faker }, options) {
  const bookings = streamQuery(reader, CHILD_SOURCES.bookings.sql, []);

  return loadTable(writer, {
    table: transactionsGenerator.TABLE,
    columns: transactionsGenerator.COLUMNS,
    rows: transactionsGenerator.createRows({ faker, bookings }),
    manageIndexes: !options.keepIndexes,
  });
}

/** `payments`, one per transaction. */
async function runPayments({ writer, reader, faker }, options) {
  const transactions = streamQuery(reader, CHILD_SOURCES.transactions.sql, []);

  return loadTable(writer, {
    table: paymentsGenerator.TABLE,
    columns: paymentsGenerator.COLUMNS,
    rows: paymentsGenerator.createRows({ faker, transactions }),
    manageIndexes: !options.keepIndexes,
  });
}

/**
 * `invoices`, one per captured transaction.
 *
 * The admin dashboard sums `invoices.amount` for revenue, so an empty table
 * reports $0 no matter how many bookings exist.
 */
async function runInvoices({ writer, reader, faker }, options) {
  const transactions = streamQuery(reader, CHILD_SOURCES.transactions.sql, []);

  return loadTable(writer, {
    table: invoicesGenerator.TABLE,
    columns: invoicesGenerator.COLUMNS,
    rows: invoicesGenerator.createRows({ faker, transactions }),
    manageIndexes: !options.keepIndexes,
  });
}

/** Owner replies on a share of published reviews. */
async function runReviewReplies({ writer, reader, faker }, options) {
  const ownerSampler = await createIdSampler('hotel_staff');
  if (ownerSampler.size === 0) {
    console.log('   ⚠️  No hotel staff accounts found — skipping review replies');
    return { table: reviewRepliesGenerator.TABLE, affectedRows: 0, ms: 0 };
  }

  const reviews = streamQuery(reader, CHILD_SOURCES.published_reviews.sql, []);

  return loadTable(writer, {
    table: reviewRepliesGenerator.TABLE,
    columns: reviewRepliesGenerator.COLUMNS,
    rows: reviewRepliesGenerator.createRows({
      faker,
      reviews,
      ownerIds: ownerSampler.all(),
      replyRatio: options.reviewReplyRatio,
    }),
    manageIndexes: !options.keepIndexes,
  });
}

/**
 * Helpful votes, then `reviews.helpful_count` is recomputed from them.
 *
 * The reviews generator seeds `helpful_count` as a random number; left alone it
 * would contradict the votes table, so it is resynced once the votes exist.
 */
async function runReviewHelpfulVotes({ writer, reader, faker }, options) {
  const userSampler = await createIdSampler('users');
  if (userSampler.size === 0) {
    console.log('   ⚠️  No users found — skipping review helpful votes');
    return { table: reviewHelpfulVotesGenerator.TABLE, affectedRows: 0, ms: 0 };
  }

  const reviews = streamQuery(reader, CHILD_SOURCES.published_reviews.sql, []);

  const result = await loadTable(writer, {
    table: reviewHelpfulVotesGenerator.TABLE,
    columns: reviewHelpfulVotesGenerator.COLUMNS,
    rows: reviewHelpfulVotesGenerator.createRows({
      faker,
      reviews,
      userSampler,
      maxVotesPerReview: options.maxVotesPerReview,
    }),
    manageIndexes: !options.keepIndexes,
  });

  const synced = await syncHelpfulCounts(writer);
  console.log(`   🔄 Resynced helpful_count on ${synced.affectedRows} review(s)`);

  return { ...result, affectedRows: result.affectedRows + synced.affectedRows };
}

/**
 * Guest photos on reviews.
 *
 * URLs point at objects the image step already uploaded, so this must run after
 * images; reviews whose hotel has no image are skipped (`url` is NOT NULL).
 */
async function runReviewMedia({ writer, reader, faker }, options) {
  const reviews = streamQuery(reader, CHILD_SOURCES.reviews_with_media.sql, []);

  return loadTable(writer, {
    table: reviewMediaGenerator.TABLE,
    columns: reviewMediaGenerator.COLUMNS,
    rows: reviewMediaGenerator.createRows({ faker, reviews, mediaRatio: options.reviewMediaRatio }),
    manageIndexes: !options.keepIndexes,
  });
}

/** Wishlist rows for every user. */
async function runSavedHotels({ writer, reader, faker }, options) {
  const hotelSampler = await createIdSampler('hotels');
  if (hotelSampler.size === 0) {
    console.log('   ⚠️  No hotels found — skipping saved hotels');
    return { table: savedHotelsGenerator.TABLE, affectedRows: 0, ms: 0 };
  }

  const userIds = streamColumn(reader, 'SELECT `id` FROM `users`', 'id');

  return loadTable(writer, {
    table: savedHotelsGenerator.TABLE,
    columns: savedHotelsGenerator.COLUMNS,
    rows: savedHotelsGenerator.createRows({
      faker,
      userIds,
      hotelSampler,
      savedPerUser: options.savedHotelsPerUser,
    }),
    manageIndexes: !options.keepIndexes,
  });
}

/**
 * `hotel_rating_summaries`, rebuilt from published reviews.
 *
 * Runs after reviews and before snapshots: the summary is the only rating source
 * in the project, and `snapshots.js` LEFT JOINs it to fill `avg_rating`.
 */
async function runRatingSummaries({ writer }, options) {
  return rebuildHotelRatingSummaries(writer, {
    clear: true,
    manageIndexes: !options.keepIndexes,
  });
}

/**
 * Recompute `room_inventory.booked_rooms` from the seeded bookings.
 *
 * `reserveRooms`/`releaseRooms` own this column at runtime; without the backfill
 * availability always reads "everything free".
 */
async function runBookedRooms({ writer }, options) {
  return backfillBookedRooms(writer);
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
  booking_rooms: runBookingRooms,
  bookings: runBookings,
  booked_rooms: runBookedRooms,
  hotel_amenities: runHotelAmenities,
  hotel_cancellation_rules: runHotelCancellationRules,
  hotel_policies: runHotelPolicies,
  hotel_rating_summaries: runRatingSummaries,
  hotel_search_snapshots: runSnapshots,
  hotels: runHotels,
  invoices: runInvoices,
  nearby_places: runNearbyPlaces,
  notifications: runNotifications,
  payments: runPayments,
  review_helpful_votes: runReviewHelpfulVotes,
  review_media: runReviewMedia,
  review_replies: runReviewReplies,
  reviews: runReviews,
  room_amenities: runRoomAmenities,
  room_inventory: runRoomInventory,
  rooms: runRooms,
  saved_hotels: runSavedHotels,
  transactions: runTransactions,
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
 * Registered table keys that are post-processing steps over other tables rather
 * than tables of their own, so `--clear` must not try to TRUNCATE them.
 */
const POST_PROCESSING_STEPS = new Set(['booked_rooms']);

/**
 * Run a single fast table. When `options.clear` is set, truncate just that table.
 */
async function runFastTable(ctx, table, options = {}) {
  const runner = RUNNERS[table];
  if (!runner) {
    throw new Error(`No fast generator registered for "${table}"`);
  }

  if (options.clear && !POST_PROCESSING_STEPS.has(table)) {
    await truncateTables(ctx.writer, [table]);
  }

  return runner(ctx, options);
}

module.exports = {
  CHILD_SOURCES,
  MANIFEST_SOURCES,
  REQUIRED_MANIFESTS,
  RUNNERS,
  createFastContext,
  ensureManifests,
  fetchAmenityIds,
  runFastTable,
};
