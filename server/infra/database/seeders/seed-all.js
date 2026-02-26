require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const db = require('../../../models');
const sequelize = require('../../../config/database.config');

// Import all seed functions
const { seedUsers } = require('./user.seed');
const { seedAmenities } = require('./amenity.seed');
const { seedHotels } = require('./hotel.seed');
const { seedHotelAmenities } = require('./hotel_amenity.seed');
const { seedHotelPolicies } = require('./hotel_policy.seed');
const { seedNearbyPlaces } = require('./nearby_place.seed');
const { seedRooms } = require('./room.seed');
const { seedRoomAmenities } = require('./room_amenity.seed');
const { seedRoomInventory } = require('./room_inventory.seed');
// const { seedBookings } = require('./booking.seed');
const { seedReviews } = require('./review.seed');
// const { seedNotifications } = require('./notification.seed');
const { seedPermissions } = require('./permission.seed');
const { rebuildAllSnapshots } = require('./hotel_search_snapshot.seed');

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    clearExisting: args.includes('--clear'),
    skipImages: args.includes('--skip-images'),
    skipSnapshots: args.includes('--skip-snapshots'),
    quick: args.includes('--quick'), // Reduced counts for faster seeding
  };
  return options;
}

// Print banner
function printBanner() {
  console.log('\n' + '='.repeat(80));
  console.log('  DATABASE SEEDING - ALL TABLES');
  console.log('  Running all seeders in correct dependency order');
  console.log('='.repeat(80) + '\n');
}

// Print summary
function printSummary(results, startTime, endTime) {
  console.log('\n' + '='.repeat(80));
  console.log('  SEEDING SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Duration: ${((endTime - startTime) / 1000).toFixed(2)}s\n`);

  console.log('Status by Seeder:');
  results.forEach((result) => {
    const status = result.success ? '✅' : '❌';
    const time = result.duration ? ` (${result.duration.toFixed(2)}s)` : '';
    console.log(`  ${status} ${result.name}${time}`);
    if (!result.success && result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`\nTotal: ${successCount} successful, ${failCount} failed`);
  console.log('='.repeat(80) + '\n');
}

// Execute a seeder with error handling and timing
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

// Main seeding function
async function seedAll() {
  const startTime = Date.now();
  const options = parseArgs();

  printBanner();

  // Display options
  if (options.clearExisting) {
    console.log('⚠️  --clear flag detected: Will clear existing data before seeding');
  }
  if (options.skipImages) {
    console.log('⚠️  --skip-images flag detected: Skipping image seeding');
  }
  if (options.skipSnapshots) {
    console.log('⚠️  --skip-snapshots flag detected: Skipping search snapshot generation');
  }
  if (options.quick) {
    console.log('⚠️  --quick flag detected: Using reduced counts for faster seeding');
  }
  console.log('');

  const results = [];

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // 1. Seed Users (creates roles first)
    results.push(
      await executeSeed('Users', seedUsers, {
        userCount: options.quick ? 20 : 50,
        managerCount: options.quick ? 5 : 10,
        staffCount: options.quick ? 10 : 20,
        clearExisting: options.clearExisting,
      })
    );

    // 2. Seed Amenities (standalone)
    results.push(
      await executeSeed('Amenities', seedAmenities, {
        clearExisting: options.clearExisting,
      })
    );

    // 3. Seed Hotels (standalone)
    results.push(
      await executeSeed('Hotels', seedHotels, {
        count: options.quick ? 10 : 20,
        clearExisting: options.clearExisting,
      })
    );

    // 4. Seed Hotel Amenities (depends on hotels + amenities)
    results.push(
      await executeSeed('Hotel Amenities', seedHotelAmenities, {
        minAmenitiesPerHotel: 5,
        maxAmenitiesPerHotel: options.quick ? 15 : 25,
        clearExisting: options.clearExisting,
      })
    );

    // 5. Seed Hotel Policies (depends on hotels)
    results.push(
      await executeSeed('Hotel Policies', seedHotelPolicies, {
        clearExisting: options.clearExisting,
      })
    );

    // 6. Seed Nearby Places (depends on hotels)
    results.push(
      await executeSeed('Nearby Places', seedNearbyPlaces, {
        minPlacesPerHotel: 3,
        maxPlacesPerHotel: options.quick ? 8 : 15,
        clearExisting: options.clearExisting,
      })
    );

    // 7. Seed Rooms (depends on hotels)
    results.push(
      await executeSeed('Rooms', seedRooms, {
        roomsPerHotel: options.quick ? { min: 3, max: 5 } : { min: 3, max: 8 },
        clearExisting: options.clearExisting,
      })
    );

    // 8. Seed Room Amenities (depends on rooms + amenities)
    results.push(
      await executeSeed('Room Amenities', seedRoomAmenities, {
        minAmenitiesPerRoom: 3,
        maxAmenitiesPerRoom: options.quick ? 8 : 12,
        clearExisting: options.clearExisting,
      })
    );

    // 9. Seed Room Inventory (depends on rooms)
    results.push(
      await executeSeed('Room Inventory', seedRoomInventory, {
        daysAhead: options.quick ? 30 : 90,
        clearExisting: options.clearExisting,
        priceMin: 80,
        priceMax: 350,
        currency: 'USD',
      })
    );

    // 10. Seed Bookings (depends on hotels, rooms, users)
    // results.push(
    //   await executeSeed('Bookings', seedBookings, {
    //     bookingsPerHotel: options.quick ? { min: 10, max: 20 } : { min: 20, max: 50 },
    //     clearExisting: options.clearExisting,
    //   })
    // );

    // 11. Seed Reviews (depends on hotels, users, optionally bookings)
    results.push(
      await executeSeed('Reviews', seedReviews, {
        reviewsPerHotel: options.quick ? { min: 5, max: 15 } : { min: 10, max: 30 },
        useBookings: false,
        clearExisting: options.clearExisting,
      })
    );

    // 12. Seed Images (depends on hotels, rooms - requires API server)
    if (!options.skipImages) {
      console.log(
        '\n⚠️  Image seeding requires the API server to be running and image files to be present.'
      );
      console.log('    To seed images, run separately: npm run seed:images');
      console.log('    Skipping image seeding for now...');
      results.push({ name: 'Images', success: true, duration: 0, skipped: true });
    }

    // 13. Seed Notifications (depends on users)
    // results.push(
    //   await executeSeed('Notifications', seedNotifications, {
    //     notificationsPerUser: options.quick ? { min: 2, max: 5 } : { min: 3, max: 10 },
    //     clearExisting: options.clearExisting,
    //   })
    // );

    // 14. Seed Permissions (standalone)
    results.push(
      await executeSeed('Permissions', seedPermissions, {
        clearExisting: options.clearExisting,
      })
    );

    // 15. Seed Hotel Search Snapshots (depends on hotels)
    if (!options.skipSnapshots) {
      results.push(
        await executeSeed('Hotel Search Snapshots', rebuildAllSnapshots, {
          clearExisting: options.clearExisting,
        })
      );
    } else {
      console.log('\n⚠️  Skipping Hotel Search Snapshots as per --skip-snapshots flag');
      results.push({ name: 'Hotel Search Snapshots', success: true, duration: 0, skipped: true });
    }

    // Close database connection
    await db.sequelize.close();
    console.log('\n✅ Database connection closed');

    const endTime = Date.now();
    printSummary(results, startTime, endTime);

    // Exit with appropriate code
    const hasFailures = results.some((r) => !r.success);
    process.exit(hasFailures ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    await db.sequelize.close();
    process.exit(1);
  }
}

// If running directly
if (require.main === module) {
  seedAll();
}

module.exports = {
  seedAll,
};
