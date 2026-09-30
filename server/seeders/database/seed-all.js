/**
 * Database seeding orchestrator (hybrid).
 *
 * Fast, LOAD DATA-backed seeding for the large tables (hotels, rooms, inventory,
 * junctions, bookings, reviews, notifications, snapshots) combined with the
 * existing Sequelize seeders for small/reference data (countries, cities,
 * users, amenities, policies, permissions, ...). Images go straight to MinIO
 * with bulk metadata inserts (no API dependency).
 *
 * The previous implementation lives on as `seed-all.legacy.js` and is still
 * available via `npm run seed:all:legacy`.
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const sequelize = require('../../config/database.config');
const db = require('../../models');
const { runImages } = require('../lib/images');
const { resetTmpDir } = require('../lib/parent-index');
const elasticsearch = require('../lib/elasticsearch');
const pipeline = require('../lib/pipeline');

// Legacy seeders (reference / small tables)
const { seedUsers } = require('./user.seed');
const { seedAmenities } = require('./amenity.seed');
const { seedPermissions } = require('./permission.seed');
const { seedHotelStaff } = require('./hotel_staff.seed');
const { seedCountries } = require('./country.seed');
const { seedCities } = require('./city.seed');
const { seedDestinations } = require('./destinations.seed');
const seedSearchLogs = require('../mongodb/search_logs.seed');
const seedHotelViewEvents = require('../mongodb/hotel_view_events.seed');

function parseArgs() {
  const args = process.argv.slice(2);
  const concurrencyArg = args.find((arg) => arg.startsWith('--images-concurrency='));
  const imagesConcurrency = concurrencyArg
    ? Number.parseInt(concurrencyArg.split('=')[1], 10)
    : undefined;

  return {
    clearExisting: args.includes('--clear'),
    imagesConcurrency:
      Number.isInteger(imagesConcurrency) && imagesConcurrency > 0 ? imagesConcurrency : undefined,
    skipImages: args.includes('--skip-images'),
    skipMongo: args.includes('--skip-mongo'),
    skipElasticsearch: args.includes('--skip-elasticsearch'),
    skipSnapshots: args.includes('--skip-snapshots'),
    skipKeycloak: args.includes('--skip-keycloak'),
    keepIndexes: args.includes('--keep-indexes'),
    refreshManifests: args.includes('--refresh-manifests'),
    quick: args.includes('--quick'), // Reduced counts for faster seeding
  };
}

function printBanner() {
  console.log('\n' + '='.repeat(80));
  console.log('  DATABASE SEEDING - ALL TABLES (HYBRID LOAD DATA)');
  console.log('  Reference tables via Sequelize, large tables via LOAD DATA');
  console.log('='.repeat(80) + '\n');
}

function printSummary(results, startTime, endTime) {
  console.log('\n' + '='.repeat(80));
  console.log('  SEEDING SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Duration: ${((endTime - startTime) / 1000).toFixed(2)}s\n`);

  console.log('Status by Seeder:');
  results.forEach((result) => {
    const status = result.success ? '✅' : '❌';
    const time = result.duration ? ` (${result.duration.toFixed(2)}s)` : '';
    const rows =
      result.rows !== undefined && result.rows !== null ? ` — ${result.rows} row(s)` : '';
    console.log(`  ${status} ${result.name}${time}${rows}`);
    if (!result.success && result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`\nTotal: ${successCount} successful, ${failCount} failed`);
  console.log('='.repeat(80) + '\n');
}

async function executeSeed(name, seedFn, options = {}) {
  const startTime = Date.now();
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`🌱 Seeding: ${name}`);
  console.log(`${'─'.repeat(80)}`);

  try {
    await seedFn(options);
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ ${name} completed in ${duration.toFixed(2)}s`);
    return { name, success: true, duration };
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    console.error(`❌ ${name} failed:`, error.message);
    return { name, success: false, duration, error: error.message };
  }
}

// Execute a fast-pipeline table with error handling and timing.
async function executeFastSeed(ctx, name, table, options) {
  const startTime = Date.now();
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`⚡ Fast seeding: ${name} (${table})`);
  console.log(`${'─'.repeat(80)}`);

  try {
    // Always rebuild manifests right before the table runs: its parents were
    // just seeded, so a manifest left over from an earlier run would be stale.
    await pipeline.ensureManifests(ctx.reader, [table], { refresh: true });
    const result = await pipeline.runFastTable(ctx, table, options);
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ ${name} completed in ${duration.toFixed(2)}s (${result.affectedRows} row(s))`);
    return { name, success: true, duration, rows: result.affectedRows };
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    console.error(`❌ ${name} failed:`, error.message);
    return { name, success: false, duration, error: error.message };
  }
}

// Execute the fast image seeder with error handling and timing.
async function executeImagesSeed(ctx, name, options) {
  const startTime = Date.now();
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`🖼️  Image seeding: ${name}`);
  console.log(`${'─'.repeat(80)}`);

  try {
    const result = await runImages({ writer: ctx.writer, reader: ctx.reader, options });
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ ${name} completed in ${duration.toFixed(2)}s (${result.affectedRows} row(s))`);
    return { name, success: true, duration, rows: result.affectedRows };
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    console.error(`❌ ${name} failed:`, error.message);
    return { name, success: false, duration, error: error.message };
  }
}

async function seedAll() {
  const startTime = Date.now();
  const options = parseArgs();

  printBanner();
  if (options.quick) {
    console.log('⚠️  --quick flag detected: Using reduced counts for faster seeding');
  }

  const fastOptions = {
    clear: options.clearExisting,
    keepIndexes: options.keepIndexes,
    refreshManifests: options.refreshManifests,
    hotelsPerCity: options.quick ? 80 : 200,
    roomsPerHotel: options.quick ? { min: 3, max: 5 } : { min: 3, max: 8 },
    minAmenitiesPerHotel: 5,
    maxAmenitiesPerHotel: options.quick ? 15 : 25,
    minAmenitiesPerRoom: 3,
    maxAmenitiesPerRoom: options.quick ? 8 : 12,
    placesPerHotel: options.quick ? { min: 8, max: 12 } : { min: 15, max: 25 },
    daysAhead: options.quick ? 30 : 90,
    priceMin: 80,
    priceMax: 350,
    currency: 'USD',
    bookingsPerHotel: options.quick ? { min: 10, max: 20 } : { min: 20, max: 50 },
    reviewsPerHotel: options.quick ? { min: 5, max: 15 } : { min: 10, max: 30 },
    notificationsPerUser: options.quick ? { min: 2, max: 5 } : { min: 3, max: 10 },
  };

  const results = [];
  let fastCtx;

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    fastCtx = await pipeline.createFastContext();
    // Start from a clean scratch dir so no stale parent-id manifests are reused.
    resetTmpDir();
    console.log('✅ Fast pipeline connections established\n');

    // ── Reference data (legacy / small tables) ────────────────────────────
    results.push(
      await executeSeed('Countries (Vietnam)', seedCountries, {
        clearExisting: options.clearExisting,
      })
    );
    results.push(
      await executeSeed('Cities (Vietnam)', seedCities, { clearExisting: options.clearExisting })
    );
    results.push(
      await executeSeed('Destinations', seedDestinations, {
        clearExisting: options.clearExisting,
      })
    );
    results.push(
      await executeSeed('Users', seedUsers, {
        userCount: options.quick ? 20 : 50,
        managerCount: options.quick ? 5 : 10,
        staffCount: options.quick ? 10 : 20,
        clearExisting: options.clearExisting,
      })
    );
    results.push(
      await executeSeed('Amenities', seedAmenities, { clearExisting: options.clearExisting })
    );

    // ── Large tables (fast LOAD DATA pipeline) ────────────────────────────
    results.push(await executeFastSeed(fastCtx, 'Hotels', 'hotels', fastOptions));
    results.push(await executeFastSeed(fastCtx, 'Rooms', 'rooms', fastOptions));
    results.push(await executeFastSeed(fastCtx, 'Hotel Amenities', 'hotel_amenities', fastOptions));
    results.push(await executeFastSeed(fastCtx, 'Room Amenities', 'room_amenities', fastOptions));
    results.push(await executeFastSeed(fastCtx, 'Room Inventory', 'room_inventory', fastOptions));

    // ── Hotel-dependent data (fast) ───────────────────────────────────────
    results.push(await executeFastSeed(fastCtx, 'Hotel Policies', 'hotel_policies', fastOptions));
    results.push(
      await executeFastSeed(
        fastCtx,
        'Hotel Cancellation Rules',
        'hotel_cancellation_rules',
        fastOptions
      )
    );
    results.push(await executeFastSeed(fastCtx, 'Nearby Places', 'nearby_places', fastOptions));
    results.push(
      await executeSeed('Admin & Hotel Staff', seedHotelStaff, {
        hotelId: process.env.SEED_HOTEL_ID || undefined,
        password: process.env.SEED_TEST_PASSWORD || undefined,
        syncKeycloak: !options.skipKeycloak,
      })
    );

    // ── Activity data (fast) ──────────────────────────────────────────────
    results.push(await executeFastSeed(fastCtx, 'Bookings', 'bookings', fastOptions));
    results.push(await executeFastSeed(fastCtx, 'Reviews', 'reviews', fastOptions));

    // ── Images (fast: direct MinIO upload + bulk metadata) ────────────────
    if (!options.skipImages) {
      results.push(
        await executeImagesSeed(fastCtx, 'Images', {
          concurrency: options.imagesConcurrency,
        })
      );
    } else {
      console.log('\n⚠️  Skipping Images as per --skip-images flag');
      results.push({ name: 'Images', success: true, duration: 0, skipped: true });
    }

    results.push(await executeFastSeed(fastCtx, 'Notifications', 'notifications', fastOptions));

    // ── Permissions (legacy) ──────────────────────────────────────────────
    results.push(
      await executeSeed('Permissions', seedPermissions, { clearExisting: options.clearExisting })
    );

    // ── MongoDB analytics (depends on destinations + hotels) ──────────────
    if (!options.skipMongo) {
      results.push(
        await executeSeed('MongoDB Search Logs', seedSearchLogs, {
          rows: options.quick ? 5000 : 50000,
          days: 90,
          batch: 2000,
          clear: options.clearExisting,
          closeSequelize: false,
        })
      );
      results.push(
        await executeSeed('MongoDB Hotel View Events', seedHotelViewEvents, {
          days: 30,
          avgPerHotel: options.quick ? 10 : 50,
          batch: 1000,
          clear: options.clearExisting,
          closeSequelize: false,
        })
      );
    } else {
      console.log('\n⚠️  Skipping MongoDB analytics as per --skip-mongo flag');
      results.push({ name: 'MongoDB Search Logs', success: true, duration: 0, skipped: true });
      results.push({
        name: 'MongoDB Hotel View Events',
        success: true,
        duration: 0,
        skipped: true,
      });
    }

    // ── Search snapshots (fast, set-based) ────────────────────────────────
    if (!options.skipSnapshots) {
      results.push(
        await executeFastSeed(
          fastCtx,
          'Hotel Search Snapshots',
          'hotel_search_snapshots',
          fastOptions
        )
      );
    } else {
      console.log('\n⚠️  Skipping Hotel Search Snapshots as per --skip-snapshots flag');
      results.push({ name: 'Hotel Search Snapshots', success: true, duration: 0, skipped: true });
    }

    // ── Elasticsearch search indices (optional, best effort) ───────────────
    if (options.skipElasticsearch) {
      console.log('\n⚠️  Skipping Elasticsearch indexing as per --skip-elasticsearch flag');
      results.push({
        name: 'Elasticsearch Search Indices',
        success: true,
        duration: 0,
        skipped: true,
      });
    } else if (!(await elasticsearch.isAvailable())) {
      console.log(
        '\n⚠️  Elasticsearch is not reachable — skipping search index seeding.\n' +
          '    Start it (docker compose up -d elasticsearch) then run:\n' +
          '      npm run es:seed-destinations && npm run es:seed-hotels'
      );
      results.push({
        name: 'Elasticsearch Search Indices',
        success: true,
        duration: 0,
        skipped: true,
      });
    } else {
      results.push(
        await executeSeed(
          'Elasticsearch Search Indices',
          () => elasticsearch.seedSearchIndices({ batchSize: options.quick ? 200 : 500 }),
          {}
        )
      );
    }
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    if (fastCtx) {
      await fastCtx.close();
    }
    await db.sequelize.close();
    process.exit(1);
  }

  if (fastCtx) {
    await fastCtx.close();
  }
  await elasticsearch.close();
  await db.sequelize.close();
  console.log('\n✅ Database connection closed');

  printSummary(results, startTime, Date.now());

  const hasFailures = results.some((r) => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

if (require.main === module) {
  seedAll();
}

module.exports = {
  seedAll,
};
