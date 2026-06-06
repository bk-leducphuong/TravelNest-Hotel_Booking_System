require('../../register-aliases');
const fs = require('fs');
const path = require('path');

const NodeFormData = require('form-data');
const axios = require('axios');
const { Op } = require('sequelize');

const db = require('../../models');
const logger = require('../../config/logger.config');
const { deleteObjects } = require('../../utils/minio.utils');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const Hotels = db.hotels;
const Rooms = db.rooms;
const Images = db.images;
const ImageVariants = db.image_variants;

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const API_ORIGIN = new URL(API_BASE_URL).origin;
const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || `${API_ORIGIN}/health/live`;
const IMAGES_BASE_DIR = path.join(__dirname, 'images');
const HOTEL_IMAGES_DIR = path.join(IMAGES_BASE_DIR, 'hotels');
const ROOM_IMAGES_DIR = path.join(IMAGES_BASE_DIR, 'rooms');

const stats = {
  totalHotels: 0,
  totalRooms: 0,
  imagesUploaded: 0,
  imagesFailed: 0,
  startTime: null,
  endTime: null,
  errors: [],
};

function resetStats() {
  stats.totalHotels = 0;
  stats.totalRooms = 0;
  stats.imagesUploaded = 0;
  stats.imagesFailed = 0;
  stats.startTime = null;
  stats.endTime = null;
  stats.errors = [];
}

/**
 * Load image "albums" from a base directory.
 *
 * Supported structures:
 * - Flat:   images/hotels/*.jpg
 * - Nested: images/hotels/<any-folder>/*.jpg
 *
 * Returns an array of albums, where each album is an array of absolute file paths.
 */
function loadImageAlbums(baseDir) {
  const albums = [];

  if (!fs.existsSync(baseDir)) {
    return albums;
  }

  const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  // Images directly under baseDir → one album
  const directImages = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(baseDir, entry.name))
    .filter((fullPath) => imageExtensions.has(path.extname(fullPath).toLowerCase()));

  if (directImages.length > 0) {
    albums.push(directImages);
  }

  // Each subdirectory under baseDir → separate album
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dirPath = path.join(baseDir, entry.name);
    const files = fs
      .readdirSync(dirPath)
      .map((name) => path.join(dirPath, name))
      .filter((fullPath) => {
        const ext = path.extname(fullPath).toLowerCase();
        return imageExtensions.has(ext) && fs.statSync(fullPath).isFile();
      });

    if (files.length > 0) {
      albums.push(files);
    }
  }

  return albums;
}

function printBanner() {
  console.log('\n' + '='.repeat(70));
  console.log('  IMAGE PROCESSING PIPELINE TEST');
  console.log('  Testing: Routes → Controller → Service → Queue → Worker → MinIO');
  console.log('='.repeat(70) + '\n');
}

function printStats() {
  console.log('\n' + '='.repeat(70));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Hotels:       ${stats.totalHotels}`);
  console.log(`Total Rooms:        ${stats.totalRooms}`);
  console.log(`Images Uploaded:    ${stats.imagesUploaded}`);
  console.log(`Images Failed:      ${stats.imagesFailed}`);
  console.log(`Duration:           ${((stats.endTime - stats.startTime) / 1000).toFixed(2)}s`);
  console.log(
    `Success Rate:       ${(
      (stats.imagesUploaded / (stats.imagesUploaded + stats.imagesFailed)) *
      100
    ).toFixed(2)}%`
  );

  if (stats.errors.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('  ERRORS');
    console.log('-'.repeat(70));
    stats.errors.slice(0, 10).forEach((error, index) => {
      console.log(`${index + 1}. ${error.entityType} ${error.entityId}:`);
      console.log(`   ${error.message}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }

  console.log('='.repeat(70) + '\n');
}

function groupObjectKeysByBucket(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const bucketName = row.bucket_name;
    const objectKey = row.object_key;

    if (!bucketName || !objectKey) continue;

    if (!grouped.has(bucketName)) {
      grouped.set(bucketName, new Set());
    }

    grouped.get(bucketName).add(objectKey);
  }

  return grouped;
}

async function deleteMinioObjects(rows) {
  const grouped = groupObjectKeysByBucket(rows);

  for (const [bucketName, objectKeys] of grouped.entries()) {
    await deleteObjects(bucketName, Array.from(objectKeys));
  }
}

async function cleanupExistingImages(entityType, entityIds) {
  if (!entityIds || entityIds.length === 0) {
    return;
  }

  const images = await Images.findAll({
    where: {
      entity_type: entityType,
      entity_id: {
        [Op.in]: entityIds,
      },
    },
    attributes: ['id', 'bucket_name', 'object_key'],
    raw: true,
  });

  if (images.length === 0) {
    console.log(`No existing ${entityType} images found to clean`);
    return;
  }

  const imageIds = images.map((image) => image.id);
  const variants = await ImageVariants.findAll({
    where: {
      image_id: {
        [Op.in]: imageIds,
      },
    },
    attributes: ['id', 'bucket_name', 'object_key'],
    raw: true,
  });

  console.log(
    `Cleaning existing ${entityType} images: ${images.length} originals, ${variants.length} variants`
  );

  await deleteMinioObjects([...images, ...variants]);

  const transaction = await db.sequelize.transaction();

  try {
    await ImageVariants.destroy({
      where: {
        image_id: {
          [Op.in]: imageIds,
        },
      },
      transaction,
    });

    await Images.destroy({
      where: {
        id: {
          [Op.in]: imageIds,
        },
      },
      transaction,
    });

    await transaction.commit();
    console.log(`Cleaned ${images.length} existing ${entityType} image records`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function uploadImage(entityType, entityId, imagePath, isPrimary = false) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const form = new NodeFormData();
    form.append('file', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: `image/${path.extname(imagePath).substring(1)}`,
    });
    form.append('is_primary', isPrimary.toString());

    const response = await axios.post(`${API_BASE_URL}/images/${entityType}/${entityId}`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000,
    });

    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      statusCode: error.response?.status,
    };
  }
}

async function processEntity(entityType, entityId, entityName, imageFiles) {
  console.log(`\n📦 Processing ${entityType}: ${entityName} (${entityId})`);

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    const imageFile = path.basename(imagePath);
    const isPrimary = i === 0;

    if (!fs.existsSync(imagePath)) {
      console.log(`  ⚠️  Image not found: ${imageFile}`);
      stats.imagesFailed++;
      stats.errors.push({
        entityType,
        entityId,
        entityName,
        message: `Image file not found: ${imageFile}`,
      });
      continue;
    }

    process.stdout.write(`  📤 Uploading ${imageFile} ${isPrimary ? '(PRIMARY)' : ''}... `);

    const result = await uploadImage(entityType, entityId, imagePath, isPrimary);

    if (result.success) {
      console.log(`✅ Success (ID: ${result.data.data.id})`);
      stats.imagesUploaded++;
    } else {
      console.log(`❌ Failed: ${result.error}`);
      stats.imagesFailed++;
      stats.errors.push({
        entityType,
        entityId,
        entityName,
        message: `${imageFile}: ${result.error}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function processHotels(limit = null) {
  console.log('\n' + '━'.repeat(70));
  console.log('  PROCESSING HOTELS');
  console.log('━'.repeat(70));

  const whereClause = { status: 'active' };
  const options = {
    where: whereClause,
    attributes: ['id', 'name'],
    order: [['created_at', 'ASC']],
  };

  if (limit) {
    options.limit = limit;
  }

  const hotels = await Hotels.findAll(options);
  stats.totalHotels = hotels.length;

  console.log(`Found ${hotels.length} active hotels`);

  const hotelAlbums = loadImageAlbums(HOTEL_IMAGES_DIR);

  if (hotelAlbums.length === 0) {
    console.log(`⚠️  No hotel images found in ${HOTEL_IMAGES_DIR}`);
    return;
  }

  await cleanupExistingImages(
    'hotel',
    hotels.map((hotel) => hotel.id)
  );

  let albumIndex = 0;

  for (const hotel of hotels) {
    const album = hotelAlbums[albumIndex % hotelAlbums.length];
    albumIndex += 1;
    await processEntity('hotel', hotel.id, hotel.name, album);
  }
}

async function processRooms(limit = null) {
  console.log('\n' + '━'.repeat(70));
  console.log('  PROCESSING ROOMS');
  console.log('━'.repeat(70));

  const whereClause = { status: 'active' };
  const options = {
    where: whereClause,
    attributes: ['id', 'room_name', 'hotel_id'],
    include: [
      {
        model: Hotels,
        as: 'hotel',
        attributes: ['name'],
      },
    ],
    order: [['created_at', 'ASC']],
  };

  if (limit) {
    options.limit = limit;
  }

  const rooms = await Rooms.findAll(options);
  stats.totalRooms = rooms.length;

  console.log(`Found ${rooms.length} active rooms`);

  const roomAlbums = loadImageAlbums(ROOM_IMAGES_DIR);

  if (roomAlbums.length === 0) {
    console.log(`⚠️  No room images found in ${ROOM_IMAGES_DIR}`);
    return;
  }

  await cleanupExistingImages(
    'room',
    rooms.map((room) => room.id)
  );

  let albumIndex = 0;

  for (const room of rooms) {
    const roomDisplayName = `${room.room_name} (${room.hotel?.name || 'Unknown Hotel'})`;
    const album = roomAlbums[albumIndex % roomAlbums.length];
    albumIndex += 1;
    await processEntity('room', room.id, roomDisplayName, album);
  }
}

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');

  const checks = [];

  if (!fs.existsSync(IMAGES_BASE_DIR)) {
    checks.push(`❌ Images directory not found: ${IMAGES_BASE_DIR}`);
  } else {
    console.log(`✅ Images base directory found: ${IMAGES_BASE_DIR}`);

    const hotelAlbums = loadImageAlbums(HOTEL_IMAGES_DIR);
    const roomAlbums = loadImageAlbums(ROOM_IMAGES_DIR);

    if (hotelAlbums.length > 0) {
      console.log(`✅ Hotel image albums found: ${hotelAlbums.length}`);
    } else {
      checks.push(`❌ No hotel image albums found in ${HOTEL_IMAGES_DIR}`);
    }

    if (roomAlbums.length > 0) {
      console.log(`✅ Room image albums found: ${roomAlbums.length}`);
    } else {
      checks.push(`❌ No room image albums found in ${ROOM_IMAGES_DIR}`);
    }
  }

  try {
    await axios.get(HEALTH_CHECK_URL, {
      timeout: 5000,
    });
    console.log(`✅ API server is running at ${API_ORIGIN}`);
  } catch (error) {
    const status = error.response?.status ? `HTTP ${error.response.status}` : error.code;
    const message = status || error.message || 'Unknown error';
    checks.push(`❌ API server not reachable at ${HEALTH_CHECK_URL}: ${message}`);
  }

  try {
    await Hotels.findOne();
    console.log('✅ Database connection successful');
  } catch (error) {
    checks.push(`❌ Database connection failed: ${error.message}`);
  }

  if (checks.length > 0) {
    console.log('\n⚠️  PREREQUISITE CHECKS FAILED:');
    checks.forEach((check) => console.log(`   ${check}`));
    console.log('\nPlease fix the issues above before running the test.\n');
    return false;
  }

  console.log('\n✅ All prerequisite checks passed!\n');
  return true;
}

async function seedImages(options = {}) {
  resetStats();
  printBanner();

  const flags = {
    skipPrerequisites: options.skipPrerequisites === true,
    hotelsOnly: options.hotelsOnly === true,
    roomsOnly: options.roomsOnly === true,
    limit: options.limit || null,
  };

  if (flags.limit) {
    console.log(`📊 Limiting to ${flags.limit} entities per type\n`);
  }

  if (!flags.skipPrerequisites) {
    const prereqsPassed = await checkPrerequisites();
    if (!prereqsPassed) {
      throw new Error('Image seeder prerequisite checks failed');
    }
  }

  stats.startTime = Date.now();

  if (!flags.roomsOnly) {
    await processHotels(flags.limit);
  }

  if (!flags.hotelsOnly) {
    await processRooms(flags.limit);
  }

  stats.endTime = Date.now();

  printStats();

  console.log('✨ Image seeding completed!\n');

  if (stats.imagesFailed > 0) {
    throw new Error(`Image seeding failed for ${stats.imagesFailed} image(s)`);
  }

  return { ...stats };
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const limitArg = args.find((arg) => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

    await seedImages({
      skipPrerequisites: args.includes('--skip-checks'),
      hotelsOnly: args.includes('--hotels-only'),
      roomsOnly: args.includes('--rooms-only'),
      limit,
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    logger.error('Fatal error in test script:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { uploadImage, processEntity, seedImages };
