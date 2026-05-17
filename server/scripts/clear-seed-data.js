require('../register-aliases');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

const db = require('../models');
const elasticsearchClient = require('../config/elasticsearch.config');
const mongoDb = require('../config/mongodb.config');
const { minioClient, bucketName } = require('../config/minio.config');
const HotelViewEvent = require('../models/mongo/hotel_view_event.model');
const SearchLog = require('../models/mongo/search_log.model');

const DATABASE_TABLES = [
  // Review / activity children
  'review_helpful_votes',
  'review_replies',
  'review_media',
  'reviews',
  'notifications',
  'webhook_event_logs',

  // Images
  'image_variants',
  'images',

  // Booking / payment flow
  'hold_rooms',
  'holds',
  'transactions',
  'payments',
  'invoices',
  'bookings',

  // Rooms
  'room_amenities',
  'room_inventory',
  'rooms',

  // Hotels
  'hotel_amenities',
  'hotel_policies',
  'hotel_rating_summaries',
  'hotel_search_snapshots',
  'nearby_places',
  'hotel_users',
  'saved_hotels',
  'viewed_hotels',
  'hotels',

  // Destinations
  'destinations',
  'cities',
  'countries',

  // Auth / RBAC
  'user_roles',
  'role_permissions',
  'permissions',
  'roles',
  'auth_accounts',

  // Shared seed lookup data
  'amenities',
  'users',
];

const ELASTICSEARCH_INDICES = ['hotels', 'destinations'];
const MONGODB_COLLECTIONS = [
  ['search_logs', SearchLog],
  ['hotel_view_events', HotelViewEvent],
];
const MINIO_PREFIXES = ['hotel/', 'room/', 'city/', 'country/', 'hotels/'];
const MINIO_DELETE_BATCH_SIZE = 1000;

function parseArgs(argv = process.argv.slice(2)) {
  return {
    skipDatabase: argv.includes('--skip-db'),
    skipElasticsearch: argv.includes('--skip-es'),
    skipMongodb: argv.includes('--skip-mongo') || argv.includes('--skip-mongodb'),
    skipMinio: argv.includes('--skip-minio'),
    serial: argv.includes('--serial'),
  };
}

async function truncateTable(sequelize, table) {
  try {
    await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
    return { table, success: true, method: 'TRUNCATE' };
  } catch (error) {
    console.warn(`  TRUNCATE failed for ${table}, trying DELETE (${error.message})`);
    try {
      await sequelize.query(`DELETE FROM \`${table}\`;`);
      return { table, success: true, method: 'DELETE' };
    } catch (deleteError) {
      return { table, success: false, error: deleteError.message };
    }
  }
}

async function clearDatabase() {
  const sequelize = db.sequelize;

  console.log('\n[database] Clearing seed tables...');
  await sequelize.authenticate();
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

  const results = [];

  try {
    for (const table of DATABASE_TABLES) {
      process.stdout.write(`  ${table}... `);
      const result = await truncateTable(sequelize, table);
      results.push(result);
      console.log(result.success ? result.method : `FAILED: ${result.error}`);
    }
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  }

  const failed = results.filter((result) => !result.success);

  if (failed.length > 0) {
    throw new Error(
      `Failed to clear database tables: ${failed.map((item) => item.table).join(', ')}`
    );
  }

  console.log(`[database] Cleared ${results.length} tables.`);
  return { name: 'database', cleared: results.length };
}

async function clearElasticsearchIndex(index) {
  const exists = await elasticsearchClient.indices.exists({ index });

  if (!exists) {
    console.log(`  ${index}: index does not exist`);
    return { index, deleted: 0 };
  }

  const response = await elasticsearchClient.deleteByQuery({
    index,
    refresh: true,
    conflicts: 'proceed',
    body: {
      query: {
        match_all: {},
      },
    },
  });

  console.log(`  ${index}: deleted ${response.deleted || 0} documents`);
  return { index, deleted: response.deleted || 0 };
}

async function clearElasticsearch() {
  console.log('\n[elasticsearch] Clearing seed indices...');
  await elasticsearchClient.ping();

  const results = [];
  for (const index of ELASTICSEARCH_INDICES) {
    results.push(await clearElasticsearchIndex(index));
  }

  console.log('[elasticsearch] Finished clearing indices.');
  return { name: 'elasticsearch', results };
}

async function clearMongodb() {
  console.log('\n[mongodb] Clearing seed analytics collections...');
  await mongoDb.connect();

  const results = [];

  for (const [collection, model] of MONGODB_COLLECTIONS) {
    const result = await model.deleteMany({});
    const deleted = result.deletedCount || 0;
    console.log(`  ${collection}: deleted ${deleted} documents`);
    results.push({ collection, deleted });
  }

  console.log('[mongodb] Finished clearing seed analytics collections.');
  return { name: 'mongodb', results };
}

function listObjects(prefix) {
  return new Promise((resolve, reject) => {
    const objectKeys = [];
    const stream = minioClient.listObjectsV2(bucketName, prefix, true);

    stream.on('data', (object) => {
      if (object.name) {
        objectKeys.push(object.name);
      }
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(objectKeys));
  });
}

async function removeObjectsInBatches(objectKeys) {
  let deleted = 0;

  for (let index = 0; index < objectKeys.length; index += MINIO_DELETE_BATCH_SIZE) {
    const batch = objectKeys.slice(index, index + MINIO_DELETE_BATCH_SIZE);
    await minioClient.removeObjects(bucketName, batch);
    deleted += batch.length;
  }

  return deleted;
}

async function clearMinioPrefix(prefix) {
  const objectKeys = await listObjects(prefix);

  if (objectKeys.length === 0) {
    console.log(`  ${bucketName}/${prefix}: no objects`);
    return { prefix, deleted: 0 };
  }

  const deleted = await removeObjectsInBatches(objectKeys);
  console.log(`  ${bucketName}/${prefix}: deleted ${deleted} objects`);
  return { prefix, deleted };
}

async function clearMinio() {
  console.log('\n[minio] Clearing seed image objects...');

  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    console.log(`[minio] Bucket '${bucketName}' does not exist.`);
    return { name: 'minio', results: [] };
  }

  const results = [];
  for (const prefix of MINIO_PREFIXES) {
    results.push(await clearMinioPrefix(prefix));
  }

  console.log('[minio] Finished clearing seed image objects.');
  return { name: 'minio', results };
}

async function runTask(name, task) {
  try {
    return { status: 'fulfilled', value: await task() };
  } catch (error) {
    return { status: 'rejected', name, reason: error };
  }
}

async function clearSeedData(options = parseArgs()) {
  const tasks = [];

  if (!options.skipDatabase) {
    tasks.push(['database', clearDatabase]);
  }

  if (!options.skipElasticsearch) {
    tasks.push(['elasticsearch', clearElasticsearch]);
  }

  if (!options.skipMongodb) {
    tasks.push(['mongodb', clearMongodb]);
  }

  if (!options.skipMinio) {
    tasks.push(['minio', clearMinio]);
  }

  if (tasks.length === 0) {
    console.log('Nothing to clear. All targets were skipped.');
    return [];
  }

  if (options.serial) {
    const results = [];
    for (const [name, task] of tasks) {
      results.push(await runTask(name, task));
    }
    return results;
  }

  return Promise.all(tasks.map(([name, task]) => runTask(name, task)));
}

async function main() {
  console.log('==============================================');
  console.log('  CLEAR SEED DATA');
  console.log('==============================================');
  console.log('Targets: database, Elasticsearch, MongoDB, MinIO');
  console.log('Use --skip-db, --skip-es, --skip-mongo, --skip-minio, or --serial as needed.');

  const results = await clearSeedData();
  const failed = results.filter((result) => result.status === 'rejected');

  console.log('\n==============================================');
  console.log('  CLEAR SEED DATA SUMMARY');
  console.log('==============================================');

  for (const result of results) {
    if (result.status === 'fulfilled') {
      console.log(`✅ ${result.value.name}`);
    } else {
      console.log(`❌ ${result.name}: ${result.reason.message}`);
    }
  }

  await Promise.allSettled([db.sequelize.close(), elasticsearchClient.close(), mongoDb.close()]);

  if (failed.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error('\nFatal error while clearing seed data:', error);
    await Promise.allSettled([db.sequelize.close(), elasticsearchClient.close(), mongoDb.close()]);
    process.exit(1);
  });
}

module.exports = {
  clearSeedData,
  clearDatabase,
  clearElasticsearch,
  clearMongodb,
  clearMinio,
};
