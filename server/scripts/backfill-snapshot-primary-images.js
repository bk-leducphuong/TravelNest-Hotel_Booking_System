require('../register-aliases');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

const { Op } = require('sequelize');

const db = require('../models');

const { images: Images, hotel_search_snapshots: HotelSearchSnapshots } = db;

function parseArgs(argv = process.argv.slice(2)) {
  return {
    dryRun: argv.includes('--dry-run'),
    overwrite: argv.includes('--overwrite'),
    limit: parseLimit(argv),
  };
}

function parseLimit(argv) {
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  if (!limitArg) return null;

  const limit = Number.parseInt(limitArg.split('=')[1], 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('--limit must be a positive integer');
  }

  return limit;
}

function getSnapshotWhere(overwrite) {
  if (overwrite) {
    return {};
  }

  return {
    [Op.or]: [{ primary_image_url: null }, { primary_image_url: '' }],
  };
}

async function getPrimaryImagesByHotelId(hotelIds) {
  if (hotelIds.length === 0) {
    return new Map();
  }

  const rows = await Images.findAll({
    where: {
      entity_type: 'hotel',
      entity_id: {
        [Op.in]: hotelIds,
      },
      is_primary: true,
      status: 'active',
    },
    attributes: ['entity_id', 'object_key'],
    raw: true,
  });

  return new Map(rows.map((row) => [row.entity_id, row.object_key]));
}

async function backfillPrimaryImageUrls(options = {}) {
  const { dryRun = false, overwrite = false, limit = null } = options;

  await db.sequelize.authenticate();

  const snapshots = await HotelSearchSnapshots.findAll({
    where: getSnapshotWhere(overwrite),
    attributes: ['hotel_id', 'hotel_name', 'primary_image_url'],
    order: [['hotel_id', 'ASC']],
    limit,
  });

  const hotelIds = snapshots.map((snapshot) => snapshot.hotel_id);
  const primaryImagesByHotelId = await getPrimaryImagesByHotelId(hotelIds);

  let updated = 0;
  let missingImage = 0;
  const skipped = [];

  for (const snapshot of snapshots) {
    const primaryImageUrl = primaryImagesByHotelId.get(snapshot.hotel_id);

    if (!primaryImageUrl) {
      missingImage += 1;
      skipped.push({
        hotelId: snapshot.hotel_id,
        hotelName: snapshot.hotel_name,
      });
      continue;
    }

    if (!dryRun) {
      await HotelSearchSnapshots.update(
        { primary_image_url: primaryImageUrl },
        { where: { hotel_id: snapshot.hotel_id } }
      );
    }

    updated += 1;
  }

  return {
    scanned: snapshots.length,
    updated,
    missingImage,
    skipped,
    dryRun,
    overwrite,
  };
}

function printSummary(result) {
  console.log('\nBackfill hotel_search_snapshots.primary_image_url');
  console.log('='.repeat(52));
  console.log(`Mode: ${result.dryRun ? 'dry-run' : 'update'}`);
  console.log(`Overwrite existing values: ${result.overwrite ? 'yes' : 'no'}`);
  console.log(`Snapshots scanned: ${result.scanned}`);
  console.log(`${result.dryRun ? 'Would update' : 'Updated'}: ${result.updated}`);
  console.log(`Missing active primary hotel image: ${result.missingImage}`);

  if (result.skipped.length > 0) {
    console.log('\nFirst skipped hotels:');
    result.skipped.slice(0, 10).forEach((hotel) => {
      console.log(`  - ${hotel.hotelName} (${hotel.hotelId})`);
    });
  }

  console.log('');
}

async function main() {
  try {
    const options = parseArgs();
    const result = await backfillPrimaryImageUrls(options);
    printSummary(result);
    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Failed to backfill primary image URLs:', error.message);
    await db.sequelize.close();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  backfillPrimaryImageUrls,
};
