require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

require('module-alias/register');

const db = require('../../../models');
const sequelize = require('../../../config/database.config');

const { destinations: Destinations, cities: Cities, countries: Countries } = db;

function normalizeName(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedDestinations(options = {}) {
  const { clearExisting = false } = options;

  try {
    console.log('🌱 Seeding destinations from cities and countries...');

    if (clearExisting) {
      console.log('🗑️  Clearing existing destinations...');
      const deleted = await Destinations.destroy({ where: {} });
      console.log(`✅ Deleted ${deleted} existing destination record(s)`);
    }

    const countries = await Countries.findAll({
      attributes: ['id', 'name'],
      raw: true,
    });

    const countriesById = new Map(countries.map((c) => [c.id, c]));

    // Seed country destinations
    let created = 0;
    let updated = 0;

    for (const country of countries) {
      const displayName = country.name;
      const normalized = normalizeName(displayName);
      const slug = slugify(displayName);

      const [record, wasCreated] = await Destinations.findOrCreate({
        where: {
          type: 'country',
          country_id: country.id,
        },
        defaults: {
          type: 'country',
          city_id: null,
          country_id: country.id,
          display_name: displayName,
          normalized_name: normalized,
          slug,
          country_name: displayName,
          is_active: true,
        },
      });

      if (!wasCreated) {
        await record.update({
          display_name: displayName,
          normalized_name: normalized,
          slug,
          country_name: displayName,
          is_active: true,
        });
        updated++;
      } else {
        created++;
      }
    }

    console.log(`✅ Country destinations synced: ${created} created, ${updated} updated`);

    // Seed city destinations
    created = 0;
    updated = 0;

    const cities = await Cities.findAll({
      attributes: ['id', 'name', 'slug', 'country_id'],
      raw: true,
    });

    for (const city of cities) {
      const country = countriesById.get(city.country_id);
      const countryName = country ? country.name : null;

      const displayName = city.name;
      const normalized = normalizeName(displayName);
      const slug = city.slug || slugify(displayName);

      const [record, wasCreated] = await Destinations.findOrCreate({
        where: {
          type: 'city',
          city_id: city.id,
        },
        defaults: {
          type: 'city',
          city_id: city.id,
          country_id: city.country_id,
          display_name: displayName,
          normalized_name: normalized,
          slug,
          country_name: countryName,
          is_active: true,
        },
      });

      if (!wasCreated) {
        await record.update({
          country_id: city.country_id,
          display_name: displayName,
          normalized_name: normalized,
          slug,
          country_name: countryName,
          is_active: true,
        });
        updated++;
      } else {
        created++;
      }
    }

    console.log(`✅ City destinations synced: ${created} created, ${updated} updated`);

    const total = await Destinations.count();
    console.log(`🎉 Total destinations in database: ${total}`);

    return { total };
  } catch (error) {
    console.error('❌ Error seeding destinations:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      const clearExisting = process.argv.includes('--clear');
      await seedDestinations({ clearExisting });

      await db.sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      try {
        await db.sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}

module.exports = {
  seedDestinations,
  normalizeName,
  slugify,
};

