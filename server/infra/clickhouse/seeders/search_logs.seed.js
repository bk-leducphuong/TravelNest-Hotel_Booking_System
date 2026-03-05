/**
 * ClickHouse Search Logs Seeder
 *
 * Generates synthetic search log events for the `travelnest.search_logs` table.
 *
 * Usage:
 *   - Run directly:
 *       node infra/clickhouse/search_logs.seed.js
 *
 *   - With options:
 *       node infra/clickhouse/search_logs.seed.js --rows=50000 --days=90
 *       node infra/clickhouse/search_logs.seed.js --rows=10000 --clear
 *
 * Options:
 *   - --rows=N      Number of log rows to generate (default: 10000)
 *   - --batch=N     Insert batch size (default: 1000)
 *   - --days=N      Spread search_time over the last N days (default: 60)
 *   - --clear       Truncate existing data before seeding
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

// Enable module aliases like "@config"
require('module-alias/register');

const { getClient, close } = require('@config/clickhouse.config');
const { VIETNAM_CITIES } = require('../../database/seeders/city.seed');

let faker;
async function loadFaker() {
  if (!faker) {
    const mod = await import('@faker-js/faker');
    faker = mod.faker ?? mod.default ?? mod;
  }
}

const DEFAULT_ROW_COUNT = 10000;
const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_DAYS_BACK = 60;

// Use only Vietnamese cities (provinces/municipalities) as destinations
const DESTINATIONS = VIETNAM_CITIES.map((city) => city.name);

function formatDateTime(date) {
  if (!date) return null;
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  // ClickHouse DateTime (no fractional seconds)
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDate(date) {
  if (!date) return null;
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Generate a single fake search log row matching `travelnest.search_logs` schema.
 */
function generateSearchLogRow(options = {}) {
  const { daysBack = DEFAULT_DAYS_BACK } = options;

  const now = new Date();
  const searchTime =
    daysBack > 0
      ? faker.date.between({
          from: new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000),
          to: now,
        })
      : now;

  // Some searches have specific travel dates, some are flexible
  const hasTravelDates = faker.datatype.boolean({ probability: 0.8 });

  let checkInDate = null;
  let checkOutDate = null;

  if (hasTravelDates) {
    // Check-in between today and 90 days from now
    const checkIn = faker.date.between({
      from: now,
      to: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    });
    const nights = faker.number.int({ min: 1, max: 14 });
    const checkOut = new Date(checkIn.getTime() + nights * 24 * 60 * 60 * 1000);

    // Normalize to date-only for ClickHouse Date column
    checkInDate = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
    checkOutDate = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  }

  const adults = faker.number.int({ min: 1, max: 4 });
  const children =
    faker.datatype.boolean({ probability: 0.6 }) && faker.datatype.boolean({ probability: 0.6 })
      ? faker.number.int({ min: 1, max: 3 })
      : 0;
  const rooms = faker.number.int({ min: 1, max: 3 });

  let nights = 0;
  if (checkInDate && checkOutDate) {
    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    nights = Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)));
  }

  return {
    search_id: faker.string.uuid(),
    user_id: faker.datatype.boolean({ probability: 0.8 }) ? faker.string.uuid() : null,
    location: faker.helpers.arrayElement(DESTINATIONS),
    search_time: formatDateTime(searchTime),
    adults,
    children,
    rooms,
    check_in_date: formatDate(checkInDate),
    check_out_date: formatDate(checkOutDate),
    nights,
    // nights is computed by ClickHouse default expression; we can omit it
    is_deleted: 0,
  };
}

/**
 * Parse CLI arguments.
 */
function parseArguments() {
  const args = process.argv.slice(2);

  const options = {
    rows: DEFAULT_ROW_COUNT,
    batchSize: DEFAULT_BATCH_SIZE,
    daysBack: DEFAULT_DAYS_BACK,
    clearExisting: false,
  };

  for (const arg of args) {
    if (arg === '--clear') {
      options.clearExisting = true;
    } else if (arg.startsWith('--rows=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        options.rows = value;
      }
    } else if (arg.startsWith('--batch=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        options.batchSize = value;
      }
    } else if (arg.startsWith('--days=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value) && value >= 0) {
        options.daysBack = value;
      }
    }
  }

  return options;
}

/**
 * Clear all rows from `travelnest.search_logs`.
 */
async function clearSearchLogsTable(client) {
  console.log("🗑️  Truncating table 'travelnest.search_logs'...");
  await client.command({
    query: 'TRUNCATE TABLE IF EXISTS travelnest.search_logs',
  });
  console.log('✅ Table truncated');
}

/**
 * Seed ClickHouse `travelnest.search_logs` with synthetic data.
 */
async function seedSearchLogs(options = {}) {
  await loadFaker();

  const {
    rows = DEFAULT_ROW_COUNT,
    batchSize = DEFAULT_BATCH_SIZE,
    daysBack = DEFAULT_DAYS_BACK,
    clearExisting = false,
  } = options;

  const client = getClient();

  console.log('\n🌱 Starting ClickHouse search logs seeding...\n');
  console.log(`   Target table : travelnest.search_logs`);
  console.log(`   Total rows   : ${rows}`);
  console.log(`   Batch size   : ${batchSize}`);
  console.log(`   Days back    : ${daysBack}`);
  console.log(`   Clear first  : ${clearExisting ? 'yes' : 'no'}\n`);

  if (clearExisting) {
    await clearSearchLogsTable(client);
  }

  let inserted = 0;

  while (inserted < rows) {
    const size = Math.min(batchSize, rows - inserted);
    const batch = [];

    for (let i = 0; i < size; i++) {
      batch.push(
        generateSearchLogRow({
          daysBack,
        })
      );
    }

    await client.insert({
      table: 'travelnest.search_logs',
      values: batch,
      format: 'JSONEachRow',
    });

    inserted += batch.length;
    const progress = ((inserted / rows) * 100).toFixed(1);
    console.log(
      `📈 Inserted batch of ${batch.length} rows => total ${inserted}/${rows} (${progress}%)`
    );
  }

  console.log('\n✅ ClickHouse search logs seeding complete!');
  console.log(`   Total rows inserted: ${inserted}\n`);

  return { inserted };
}

// If run directly from command line
if (require.main === module) {
  (async () => {
    try {
      const options = parseArguments();
      await seedSearchLogs(options);
      await close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error seeding ClickHouse search logs:', error);
      try {
        await close();
      } catch (closeError) {
        // Ignore close errors
      }
      process.exit(1);
    }
  })();
}

module.exports = {
  seedSearchLogs,
  generateSearchLogRow,
  parseArguments,
};
