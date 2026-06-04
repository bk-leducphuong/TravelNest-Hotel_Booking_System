/* eslint-disable no-console */
const path = require('path');
require('../../register-aliases');

const serverRoot = path.resolve(__dirname, '../..');

require('dotenv').config({
  path: path.join(serverRoot, `.env.${process.env.NODE_ENV || 'development'}`),
});

const { v4: uuidv4 } = require('uuid');
const mongoDb = require('@config/mongodb.config');
const db = require('@models');
const hotelViewEventRepository = require('@repositories/mongodb/hotel_view_event.repository');

function getArg(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return fallback;
  return match.split('=')[1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const days = Math.max(1, parseInt(getArg('days', '30'), 10));
  const avgPerHotel = Math.max(1, parseInt(getArg('avg-per-hotel', '50'), 10));
  const batchSize = Math.max(1, parseInt(getArg('batch', '1000'), 10));
  const clear = process.argv.includes('--clear');

  await db.sequelize.authenticate();
  await mongoDb.connect();

  const hotels = await db.hotels.findAll({
    attributes: ['id'],
    raw: true,
  });

  if (hotels.length === 0) {
    throw new Error('No hotels found. Seed MySQL hotels first.');
  }

  if (clear) {
    await require('@models/mongo/hotel_view_event.model').deleteMany({});
  }

  console.log(`Seeding MongoDB hotel view events for ${hotels.length} hotels...`);

  let batch = [];
  for (const hotel of hotels) {
    const eventCount = randomInt(Math.max(1, avgPerHotel - 20), avgPerHotel + 20);

    for (let index = 0; index < eventCount; index += 1) {
      batch.push({
        eventId: uuidv4(),
        hotelId: hotel.id,
        sessionId: uuidv4(),
        viewedAt: new Date(Date.now() - randomInt(0, days - 1) * 24 * 60 * 60 * 1000),
        ipAddress: `127.0.0.${randomInt(1, 254)}`,
        userAgent: 'TravelNest seeder',
      });

      if (batch.length >= batchSize) {
        await hotelViewEventRepository.insertHotelViewEvents(batch);
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    await hotelViewEventRepository.insertHotelViewEvents(batch);
  }

  await mongoDb.close();
  await db.sequelize.close();
  console.log('MongoDB hotel view event seeding complete.');
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error('Error seeding MongoDB hotel view events:', error);
    await mongoDb.close();
    await db.sequelize.close();
    process.exit(1);
  });
}

module.exports = main;
