/**
 * Hotel Search Snapshot Seed File
 *
 * Generates search snapshots for existing hotels in the database.
 * This denormalized data structure is optimized for fast search queries.
 *
 * Usage:
 *   - Run directly: node infra/database/seeders/hotel_search_snapshot.seed.js
 *   - Import and use: const { seedHotelSearchSnapshots } = require('./infra/database/seeders/hotel_search_snapshot.seed');
 *
 * Options:
 *   - hotelIds: Array of specific hotel IDs to refresh (default: all active hotels)
 *   - clearExisting: Whether to clear existing snapshots before seeding (default: false)
 *   - useFullRefresh: Use fullRefresh (recomputes all data) vs createInitialSnapshot (default: true)
 *
 * Note: This seeder depends on existing hotel data.
 */

require('dotenv').config({
  path:
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : '.env.production',
});

const db = require('../../../models');
const sequelize = require('../../../config/database.config');
const {
  fullRefresh,
  createInitialSnapshot,
  upsertSnapshot,
  getHotelBasicInfo,
  recomputePricing,
  recomputeRating,
  recomputeAmenities,
  getPrimaryImageUrl,
  checkFreeCancellation,
} = require('../../../repositories/hotel_search_snapshot.repository');

const { hotels: Hotels, hotel_search_snapshots: HotelSearchSnapshots } = db;

/**
 * Seed hotel search snapshots into the database
 * @param {Object} options - Seeding options
 * @param {Array<string>} options.hotelIds - Specific hotel IDs to process (default: all)
 * @param {boolean} options.clearExisting - Whether to delete existing snapshots first (default: false)
 * @param {boolean} options.useFullRefresh - Use fullRefresh method to recompute all data (default: true)
 * @returns {Promise<{ created: number, updated: number, failed: number }>}
 */
async function seedHotelSearchSnapshots(options = {}) {
  const {
    hotelIds = null,
    clearExisting = false,
    useFullRefresh = true,
  } = options;

  try {
    console.log('🌱 Starting hotel search snapshot seeding...');

    if (clearExisting) {
      console.log('🗑️  Clearing existing snapshots...');
      const deleted = await HotelSearchSnapshots.destroy({ where: {} });
      console.log(`✅ Deleted ${deleted} existing snapshot(s)`);
    }

    // Get hotels to process
    let hotels;
    if (hotelIds && hotelIds.length > 0) {
      hotels = await Hotels.findAll({
        where: { id: hotelIds },
        attributes: [
          'id',
          'name',
          'city',
          'country',
          'latitude',
          'longitude',
          'hotel_class',
          'status',
        ],
        raw: true,
      });
      console.log(`📋 Found ${hotels.length} specific hotels to process`);
    } else {
      hotels = await Hotels.findAll({
        attributes: [
          'id',
          'name',
          'city',
          'country',
          'latitude',
          'longitude',
          'hotel_class',
          'status',
        ],
        raw: true,
      });
      console.log(`📋 Found ${hotels.length} total hotels to process`);
    }

    if (hotels.length === 0) {
      console.log('⚠️  No hotels found to process');
      return { created: 0, updated: 0, failed: 0 };
    }

    let created = 0;
    let updated = 0;
    let failed = 0;

    // Process each hotel
    for (const hotel of hotels) {
      try {
        if (useFullRefresh) {
          // Use fullRefresh to recompute all denormalized data
          console.log(`🔄 Full refresh for hotel: ${hotel.name} (${hotel.id})`);
          await fullRefresh(hotel.id);
          updated++;
        } else {
          // Check if snapshot already exists
          const existingSnapshot = await HotelSearchSnapshots.findByPk(
            hotel.id
          );

          if (existingSnapshot) {
            // Update existing snapshot
            console.log(
              `🔄 Updating snapshot for hotel: ${hotel.name} (${hotel.id})`
            );
            await fullRefresh(hotel.id);
            updated++;
          } else {
            // Create initial snapshot
            console.log(
              `➕ Creating snapshot for hotel: ${hotel.name} (${hotel.id})`
            );
            await createInitialSnapshot(hotel.id, {
              name: hotel.name,
              city: hotel.city,
              country: hotel.country,
              latitude: hotel.latitude,
              longitude: hotel.longitude,
              hotel_class: hotel.hotel_class,
              status: hotel.status,
            });
            created++;
          }
        }

        // Log progress every 10 hotels
        if ((created + updated) % 10 === 0) {
          console.log(
            `📊 Progress: ${created + updated}/${hotels.length} processed`
          );
        }
      } catch (error) {
        failed++;
        console.error(
          `❌ Failed to process hotel ${hotel.name} (${hotel.id}):`,
          error.message
        );
      }
    }

    console.log(`\n✅ Snapshot seeding complete:`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Failed: ${failed}`);
    console.log(
      `🎉 Total snapshots in database: ${await HotelSearchSnapshots.count()}`
    );

    return { created, updated, failed };
  } catch (error) {
    console.error('❌ Error seeding hotel search snapshots:', error);
    throw error;
  }
}

/**
 * Seed snapshots for specific hotels by filtering criteria
 * @param {Object} filters - Filtering options
 * @param {string} filters.city - Filter by city
 * @param {string} filters.country - Filter by country
 * @param {string} filters.status - Filter by status
 * @param {number} filters.hotel_class - Filter by hotel class
 * @returns {Promise<{ created: number, updated: number, failed: number }>}
 */
async function seedHotelSearchSnapshotsByFilter(filters = {}) {
  const { city, country, status, hotel_class } = filters;

  const whereClause = {};
  if (city) whereClause.city = city;
  if (country) whereClause.country = country;
  if (status) whereClause.status = status;
  if (hotel_class) whereClause.hotel_class = hotel_class;

  console.log(
    `🔍 Finding hotels with filters:`,
    JSON.stringify(whereClause, null, 2)
  );

  const hotels = await Hotels.findAll({
    where: whereClause,
    attributes: ['id'],
    raw: true,
  });

  const hotelIds = hotels.map((h) => h.id);
  console.log(`📋 Found ${hotelIds.length} hotels matching filters`);

  return await seedHotelSearchSnapshots({
    hotelIds,
    clearExisting: false,
    useFullRefresh: true,
  });
}

/**
 * Rebuild all snapshots from scratch (clears and recreates)
 * @returns {Promise<{ created: number, updated: number, failed: number }>}
 */
async function rebuildAllSnapshots() {
  console.log('🔨 Rebuilding ALL snapshots from scratch...');
  return await seedHotelSearchSnapshots({
    hotelIds: null,
    clearExisting: true,
    useFullRefresh: true,
  });
}

// Run directly from command line
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      // Parse command line arguments
      const args = process.argv.slice(2);
      const rebuildFlag = args.includes('--rebuild');
      const cityFilter = args.find((arg) => arg.startsWith('--city='));
      const countryFilter = args.find((arg) => arg.startsWith('--country='));

      if (rebuildFlag) {
        await rebuildAllSnapshots();
      } else if (cityFilter || countryFilter) {
        const filters = {};
        if (cityFilter) filters.city = cityFilter.split('=')[1];
        if (countryFilter) filters.country = countryFilter.split('=')[1];
        await seedHotelSearchSnapshotsByFilter(filters);
      } else {
        await seedHotelSearchSnapshots({
          hotelIds: null,
          clearExisting: false,
          useFullRefresh: true,
        });
      }

      await db.sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      await db.sequelize.close();
      process.exit(1);
    }
  })();
}

module.exports = {
  seedHotelSearchSnapshots,
  seedHotelSearchSnapshotsByFilter,
  rebuildAllSnapshots,
};
