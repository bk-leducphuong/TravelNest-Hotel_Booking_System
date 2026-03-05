require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const db = require('../../../models');
const sequelize = require('../../../config/database.config');

const { countries: Countries } = db;

const VIETNAM_COUNTRY = {
  name: 'Vietnam',
  iso_code: 'VN',
};

/**
 * Seed the countries table with Vietnam only.
 * @param {Object} options
 * @param {boolean} options.clearExisting - Whether to delete existing countries first.
 */
async function seedCountries(options = {}) {
  const { clearExisting = false } = options;

  try {
    console.log('🌱 Starting country seeding (Vietnam only)...');

    if (clearExisting) {
      console.log('🗑️  Clearing existing countries...');
      const deleted = await Countries.destroy({ where: {} });
      console.log(`✅ Deleted ${deleted} existing country record(s)`);
    }

    const [country, created] = await Countries.findOrCreate({
      where: { iso_code: VIETNAM_COUNTRY.iso_code },
      defaults: VIETNAM_COUNTRY,
    });

    if (created) {
      console.log('✅ Created country: Vietnam (VN)');
    } else {
      console.log('ℹ️  Country Vietnam (VN) already exists, skipping creation');
    }

    const total = await Countries.count();
    console.log(`🎉 Total countries in database: ${total}`);

    return { created: created ? 1 : 0, total };
  } catch (error) {
    console.error('❌ Error seeding countries:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedCountries({
        clearExisting: false,
      });

      await db.sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedCountries,
  VIETNAM_COUNTRY,
};

