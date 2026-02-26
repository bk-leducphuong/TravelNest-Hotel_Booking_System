require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

const db = require('../models');

async function main() {
  console.log('==============================================');
  console.log('  CLEAR DATABASE - DELETE ALL APPLICATION DATA');
  console.log('==============================================\n');

  const sequelize = db.sequelize;

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Disable FK checks (MySQL)
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // IMPORTANT: only clear application tables, not Sequelize meta tables
    const tables = [
      // Order: children -> parents (rough, defensive)
      // Activity / logs
      'review_helpful_votes',
      'review_replies',
      'review_media',
      'hotel_search_snapshots',
      'notifications',
      'webhook_event_logs',

      // Images
      'image_variants',
      'images',

      // Booking / transactions
      'hold_rooms',
      'holds',
      'transactions',
      'payments',
      'invoices',
      'bookings',

      // Room related
      'room_amenities',
      'room_inventory',
      'rooms',

      // Hotel related
      'hotel_amenities',
      'hotel_policies',
      'hotel_rating_summaries',
      'nearby_places',
      'hotel_users',
      'saved_hotels',
      'viewed_hotels',
      'hotels',

      // Auth / RBAC
      'user_roles',
      'role_permissions',
      'permissions',
      'roles',

      // Core
      'amenities',
      'users',
    ];

    const results = [];

    for (const table of tables) {
      try {
        console.log(`🗑  Clearing table: ${table}`);
        // Use TRUNCATE for speed; fall back to DELETE if needed
        await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
        results.push({ table, success: true });
      } catch (err) {
        console.warn(`⚠️  TRUNCATE failed for ${table}, trying DELETE ... (${err.message})`);
        try {
          await sequelize.query(`DELETE FROM \`${table}\`;`);
          results.push({ table, success: true, viaDelete: true });
        } catch (err2) {
          console.error(`❌ Failed to clear ${table}: ${err2.message}`);
          results.push({ table, success: false, error: err2.message });
        }
      }
    }

    // Re-enable FK checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n==============================================');
    console.log('  CLEAR DATABASE SUMMARY');
    console.log('==============================================');
    for (const r of results) {
      if (r.success) {
        const method = r.viaDelete ? 'DELETE' : 'TRUNCATE';
        console.log(`✅ ${r.table} (${method})`);
      } else {
        console.log(`❌ ${r.table} – ${r.error}`);
      }
    }

    console.log('\n✅ Database clear script finished.');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error while clearing database:', error);
    try {
      await db.sequelize.close();
    } catch (_) {}
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

