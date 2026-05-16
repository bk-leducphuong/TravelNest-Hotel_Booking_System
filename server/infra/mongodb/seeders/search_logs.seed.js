/* eslint-disable no-console */
const path = require('path');
const moduleAlias = require('module-alias');

const serverRoot = path.resolve(__dirname, '../../..');
const { _moduleAliases = {} } = require(path.join(serverRoot, 'package.json'));

Object.entries(_moduleAliases).forEach(([alias, target]) => {
  moduleAlias.addAlias(alias, path.join(serverRoot, target));
});

require('dotenv').config({
  path: path.join(serverRoot, `.env.${process.env.NODE_ENV || 'development'}`),
});

const mongoDb = require('@config/mongodb.config');
const db = require('@models');
const searchLogRepository = require('@repositories/mongodb/search_log.repository');

function getArg(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return fallback;
  return match.split('=')[1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[randomInt(0, items.length - 1)];
}

async function main() {
  const rows = Math.max(1, parseInt(getArg('rows', '1000'), 10));
  const days = Math.max(1, parseInt(getArg('days', '90'), 10));
  const batchSize = Math.max(1, parseInt(getArg('batch', '1000'), 10));
  const clear = process.argv.includes('--clear');

  await db.sequelize.authenticate();
  await mongoDb.connect();

  const destinations = await db.destinations.findAll({
    where: { is_active: true },
    attributes: ['id', 'type'],
    raw: true,
  });

  if (destinations.length === 0) {
    throw new Error('No active destinations found. Seed MySQL destinations first.');
  }

  if (clear) {
    await require('@models/mongo/search_log.model').deleteMany({});
  }

  console.log(`Seeding ${rows} MongoDB search logs...`);

  let batch = [];
  for (let index = 0; index < rows; index += 1) {
    const destination = pick(destinations);
    const searchTime = new Date(Date.now() - randomInt(0, days - 1) * 24 * 60 * 60 * 1000);
    const checkInDate = new Date(searchTime.getTime() + randomInt(1, 90) * 24 * 60 * 60 * 1000);
    const checkOutDate = new Date(checkInDate.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000);

    batch.push({
      destinationId: destination.id,
      destinationType: destination.type,
      userId: null,
      checkInDate,
      checkOutDate,
      adults: randomInt(1, 4),
      children: randomInt(0, 2),
      rooms: randomInt(1, 3),
      searchTime,
    });

    if (batch.length >= batchSize) {
      await searchLogRepository.createSearchLogs(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await searchLogRepository.createSearchLogs(batch);
  }

  await mongoDb.close();
  await db.sequelize.close();
  console.log('MongoDB search log seeding complete.');
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error('Error seeding MongoDB search logs:', error);
    await mongoDb.close();
    await db.sequelize.close();
    process.exit(1);
  });
}

module.exports = main;
