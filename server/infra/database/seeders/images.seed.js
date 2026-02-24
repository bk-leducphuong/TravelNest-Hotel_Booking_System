require('module-alias/register');
const fs = require('fs');
const path = require('path');

const NodeFormData = require('form-data');
const axios = require('axios');

const db = require('../../../models');
const logger = require('../../../config/logger.config');
require('dotenv').config({
  path: process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production',
});

const Hotels = db.hotels;
const Rooms = db.rooms;

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const IMAGES_DIR = path.join(__dirname, 'images');

const IMAGE_MAPPING = {
  hotel: ['hotel_1.jpg', 'hotel_2.jpg', 'hotel_3.jpg'],
  room: ['room_1.jpeg', 'room_2.jpg', 'room_3.jpg'],
};

const stats = {
  totalHotels: 0,
  totalRooms: 0,
  imagesUploaded: 0,
  imagesFailed: 0,
  startTime: null,
  endTime: null,
  errors: [],
};

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
    const imageFile = imageFiles[i];
    const imagePath = path.join(IMAGES_DIR, imageFile);
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

  for (const hotel of hotels) {
    await processEntity('hotel', hotel.id, hotel.name, IMAGE_MAPPING.hotel);
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

  for (const room of rooms) {
    const roomDisplayName = `${room.room_name} (${room.hotel?.name || 'Unknown Hotel'})`;
    await processEntity('room', room.id, roomDisplayName, IMAGE_MAPPING.room);
  }
}

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');

  const checks = [];

  if (!fs.existsSync(IMAGES_DIR)) {
    checks.push(`❌ Images directory not found: ${IMAGES_DIR}`);
  } else {
    console.log(`✅ Images directory found: ${IMAGES_DIR}`);

    const hotelImagesExist = IMAGE_MAPPING.hotel.every((img) =>
      fs.existsSync(path.join(IMAGES_DIR, img))
    );
    const roomImagesExist = IMAGE_MAPPING.room.every((img) =>
      fs.existsSync(path.join(IMAGES_DIR, img))
    );

    if (hotelImagesExist) {
      console.log(`✅ All hotel images found (${IMAGE_MAPPING.hotel.length})`);
    } else {
      checks.push('❌ Some hotel images are missing');
    }

    if (roomImagesExist) {
      console.log(`✅ All room images found (${IMAGE_MAPPING.room.length})`);
    } else {
      checks.push('❌ Some room images are missing');
    }
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000,
    });
    console.log(`✅ API server is running at ${API_BASE_URL}`);
  } catch (error) {
    checks.push(`❌ API server not reachable at ${API_BASE_URL}`);
  }

  try {
    await Hotels.findOne();
    console.log('✅ Database connection successful');
  } catch (error) {
    checks.push(`❌ Database connection failed: ${error.message}`);
  }

  if (checks.length > 0) {
    console.log('\n' + '⚠️  PREREQUISITE CHECKS FAILED:'.red);
    checks.forEach((check) => console.log(`   ${check}`));
    console.log('\nPlease fix the issues above before running the test.\n');
    return false;
  }

  console.log('\n✅ All prerequisite checks passed!\n');
  return true;
}

async function main() {
  try {
    printBanner();

    const args = process.argv.slice(2);
    const flags = {
      skipPrerequisites: args.includes('--skip-checks'),
      hotelsOnly: args.includes('--hotels-only'),
      roomsOnly: args.includes('--rooms-only'),
      limit: null,
    };

    const limitIndex = args.findIndex((arg) => arg.startsWith('--limit='));
    if (limitIndex !== -1) {
      flags.limit = parseInt(args[limitIndex].split('=')[1], 10);
      console.log(`📊 Limiting to ${flags.limit} entities per type\n`);
    }

    if (!flags.skipPrerequisites) {
      const prereqsPassed = await checkPrerequisites();
      if (!prereqsPassed) {
        process.exit(1);
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

    console.log('✨ Image processing test completed!\n');
    console.log('💡 To monitor job processing, check the BullMQ dashboard or worker logs.\n');
    console.log('📝 Next steps:');
    console.log('   1. Check worker logs: npm run dev:bullmq-worker');
    console.log('   2. Verify images in MinIO');
    console.log('   3. Query database for image records');
    console.log('   4. Test GET /api/v1/images/:entityType/:entityId\n');

    process.exit(stats.imagesFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    logger.error('Fatal error in test script:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { uploadImage, processEntity };
