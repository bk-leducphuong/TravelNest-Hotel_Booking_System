require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

require('module-alias/register');

const fs = require('fs');
const path = require('path');

const db = require('../../../models');
const sequelize = require('../../../config/database.config');
const logger = require('../../../config/logger.config');

const { uploadImage } = require('./images.seed');

const { countries: Countries, cities: Cities } = db;

// Folder containing Vietnamese city images
// Expected path: infra/database/seeders/images/city/vietnam
const VIETNAM_CITY_IMAGES_DIR = path.join(__dirname, 'images/city/vietnam');

/**
 * Load all image filenames from the Vietnam city images directory.
 */
function loadVietnamCityImageFiles() {
  if (!fs.existsSync(VIETNAM_CITY_IMAGES_DIR)) {
    throw new Error(`Vietnam city images directory not found: ${VIETNAM_CITY_IMAGES_DIR}`);
  }

  const files = fs
    .readdirSync(VIETNAM_CITY_IMAGES_DIR)
    .filter((file) => /\.(jpe?g|png|webp)$/i.test(file));

  if (files.length === 0) {
    throw new Error(`No image files found in: ${VIETNAM_CITY_IMAGES_DIR}`);
  }

  return files;
}

/**
 * Seed city images for all Vietnamese cities.
 * Uses the same HTTP API pipeline as images.seed.js
 * (API → service → queue → worker → MinIO).
 *
 * @param {Object} options
 * @param {boolean} options.primaryOnly - If true, upload only one primary image per city.
 * @param {number|null} options.limit - Optional limit on number of cities to process.
 */
async function seedCityImages(options = {}) {
  const { primaryOnly = true, limit = null } = options;

  try {
    console.log('\n' + '='.repeat(70));
    console.log('  CITY IMAGE SEEDING - VIETNAM');
    console.log('  Using API pipeline → MinIO');
    console.log('='.repeat(70) + '\n');

    const imageFiles = loadVietnamCityImageFiles();
    console.log(
      `📁 Found ${imageFiles.length} Vietnam city image file(s) in ${VIETNAM_CITY_IMAGES_DIR}`
    );

    const vietnam = await Countries.findOne({
      where: { iso_code: 'VN' },
    });

    if (!vietnam) {
      throw new Error(
        "Vietnam country (iso_code='VN') not found. Run country/city seeders first to create it."
      );
    }

    const cityQuery = {
      where: { country_id: vietnam.id },
      order: [['name', 'ASC']],
    };

    if (limit && Number.isInteger(limit) && limit > 0) {
      cityQuery.limit = limit;
      console.log(`📊 Limiting to first ${limit} Vietnamese cities`);
    }

    const vietnamCities = await Cities.findAll(cityQuery);

    if (vietnamCities.length === 0) {
      throw new Error('No Vietnamese cities found in database. Run city seeder first.');
    }

    console.log(`🌏 Found ${vietnamCities.length} Vietnamese cities in database\n`);

    let uploaded = 0;
    let failed = 0;

    for (let i = 0; i < vietnamCities.length; i++) {
      const city = vietnamCities[i];
      console.log(
        `\n📦 Processing city ${i + 1}/${vietnamCities.length}: ${city.name} (${city.id})`
      );

      // Choose images in round-robin fashion so all files get used
      const imagesForCity = primaryOnly ? [imageFiles[i % imageFiles.length]] : imageFiles;

      for (let j = 0; j < imagesForCity.length; j++) {
        const filename = imagesForCity[j];
        const imagePath = path.join(VIETNAM_CITY_IMAGES_DIR, filename);
        const isPrimary = j === 0;

        if (!fs.existsSync(imagePath)) {
          console.log(`  ⚠️  Image not found on disk: ${filename}`);
          failed++;
          continue;
        }

        process.stdout.write(
          `  📤 Uploading ${filename} ${isPrimary ? '(PRIMARY)' : ''} for city "${city.name}"... `
        );

        const result = await uploadImage('city', city.id, imagePath, isPrimary);

        if (result.success) {
          console.log('✅ Success');
          uploaded++;
        } else {
          console.log(`❌ Failed: ${result.error}`);
          failed++;
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('  CITY IMAGE SEEDING SUMMARY');
    console.log('='.repeat(70));
    console.log(`Cities processed: ${vietnamCities.length}`);
    console.log(`Images uploaded: ${uploaded}`);
    console.log(`Images failed:   ${failed}`);
    console.log('='.repeat(70) + '\n');

    return { uploaded, failed, cities: vietnamCities.length };
  } catch (error) {
    console.error('❌ Error seeding city images:', error.message || error);
    logger.error('Error in city image seeder', { error: error.message || error });
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedCityImages({
        primaryOnly: true,
        limit: null,
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
  seedCityImages,
};
