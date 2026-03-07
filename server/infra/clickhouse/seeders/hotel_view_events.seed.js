/**
 * ClickHouse Hotel View Events Seeder
 *
 * Generates synthetic hotel view events for the `travelnest.hotel_view_events` table
 * based on all hotels and users in the MySQL database (including inactive ones).
 *
 * Usage:
 *   NODE_ENV=development node infra/clickhouse/seeders/hotel_view_events.seed.js \
 *     --days=30 --avg-per-hotel=50 --batch=1000 --clear
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

require('module-alias/register');

const { getClient, close } = require('@config/clickhouse.config');
const db = require('@models');

let faker;
async function loadFaker() {
  if (!faker) {
    const mod = await import('@faker-js/faker');
    faker = mod.faker ?? mod.default ?? mod;
  }
}

const DEFAULT_DAYS_BACK = 30;
const DEFAULT_AVG_PER_HOTEL = 50;
const DEFAULT_BATCH_SIZE = 1000;

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function parseArguments() {
  const args = process.argv.slice(2);

  const options = {
    daysBack: DEFAULT_DAYS_BACK,
    avgPerHotel: DEFAULT_AVG_PER_HOTEL,
    batchSize: DEFAULT_BATCH_SIZE,
    clearExisting: false,
  };

  for (const arg of args) {
    if (arg === '--clear') {
      options.clearExisting = true;
    } else if (arg.startsWith('--days=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value) && value >= 0) options.daysBack = value;
    } else if (arg.startsWith('--avg-per-hotel=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value) && value > 0) options.avgPerHotel = value;
    } else if (arg.startsWith('--batch=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value) && value > 0) options.batchSize = value;
    }
  }

  return options;
}

async function clearHotelViewEventsTable(client) {
  console.log("🗑️  Truncating table 'travelnest.hotel_view_events'...");
  await client.command({
    query: 'TRUNCATE TABLE IF EXISTS travelnest.hotel_view_events',
  });
  console.log('✅ Table truncated');
}

/**
 * Seed hotel view events for all hotels × users.
 * We do not literally create cartesian product events (would be huge),
 * but for each hotel we randomly sample viewers from all users.
 */
async function seedHotelViewEvents(options = {}) {
  await loadFaker();

  const {
    daysBack = DEFAULT_DAYS_BACK,
    avgPerHotel = DEFAULT_AVG_PER_HOTEL,
    batchSize = DEFAULT_BATCH_SIZE,
    clearExisting = false,
  } = options;

  const client = getClient();

  console.log('\n🌱 Starting ClickHouse hotel_view_events seeding...\n');
  console.log(`   Target table     : travelnest.hotel_view_events`);
  console.log(`   Days back        : ${daysBack}`);
  console.log(`   Avg per hotel    : ${avgPerHotel}`);
  console.log(`   Batch size       : ${batchSize}`);
  console.log(`   Clear first      : ${clearExisting ? 'yes' : 'no'}\n`);

  if (clearExisting) {
    await clearHotelViewEventsTable(client);
  }

  // Load all hotels and all users (any status)
  const Hotels = db.hotels;
  const Users = db.users;

  const [hotels, users] = await Promise.all([
    Hotels.findAll({ attributes: ['id'] }),
    Users.findAll({ attributes: ['id'] }),
  ]);

  if (hotels.length === 0) {
    console.log('⚠️  No hotels found in MySQL, nothing to seed.');
    return { inserted: 0 };
  }

  if (users.length === 0) {
    console.log('⚠️  No users found in MySQL, generating anonymous-only views.');
  }

  const userIds = users.map((u) => u.id);
  const now = new Date();

  const totalTarget = hotels.length * avgPerHotel;
  console.log(`   Hotels in MySQL  : ${hotels.length}`);
  console.log(`   Users in MySQL   : ${users.length}`);
  console.log(`   Approx rows      : ${totalTarget}\n`);

  let inserted = 0;
  let buffer = [];

  for (const hotel of hotels) {
    const hotelId = hotel.id;
    const countForHotel = faker.number.int({
      min: Math.max(1, Math.round(avgPerHotel / 2)),
      max: avgPerHotel * 2,
    });

    for (let i = 0; i < countForHotel; i++) {
      const daysAgo = daysBack > 0 ? faker.number.int({ min: 0, max: daysBack }) : 0;
      const viewedAt = new Date(
        now.getTime() -
          daysAgo * 24 * 60 * 60 * 1000 -
          faker.number.int({ min: 0, max: 23 }) * 60 * 60 * 1000 -
          faker.number.int({ min: 0, max: 59 }) * 60 * 1000
      );

      const hasUser = userIds.length > 0 && faker.datatype.boolean({ probability: 0.7 });
      const userId = hasUser ? faker.helpers.arrayElement(userIds) : null;
      const sessionId = faker.string.uuid();

      buffer.push({
        event_id: faker.string.uuid(),
        hotel_id: hotelId,
        user_id: userId,
        session_id: sessionId,
        viewed_at: formatDateTime(viewedAt),
        ip_address: faker.internet.ip(),
        user_agent: faker.internet.userAgent(),
      });

      if (buffer.length >= batchSize) {
        await client.insert({
          table: 'travelnest.hotel_view_events',
          values: buffer,
          format: 'JSONEachRow',
        });
        inserted += buffer.length;
        const progress = totalTarget > 0 ? ((inserted / totalTarget) * 100).toFixed(1) : '0.0';
        console.log(
          `📈 Inserted batch of ${buffer.length} rows => total ~${inserted}/${totalTarget} (${progress}%)`
        );
        buffer = [];
      }
    }
  }

  if (buffer.length > 0) {
    await client.insert({
      table: 'travelnest.hotel_view_events',
      values: buffer,
      format: 'JSONEachRow',
    });
    inserted += buffer.length;
    console.log(`📈 Inserted final batch of ${buffer.length} rows => total ~${inserted}`);
  }

  console.log('\n✅ ClickHouse hotel_view_events seeding complete!\n');
  return { inserted };
}

if (require.main === module) {
  (async () => {
    try {
      const options = parseArguments();
      await seedHotelViewEvents(options);
      await close();
      await db.sequelize.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error seeding ClickHouse hotel_view_events:', error);
      try {
        await close();
        await db.sequelize.close();
      } catch (e) {
        // ignore
      }
      process.exit(1);
    }
  })();
}

module.exports = {
  seedHotelViewEvents,
  parseArguments,
};

