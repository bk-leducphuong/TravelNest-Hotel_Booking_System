/**
 * Elasticsearch Hotels Index Seeder
 *
 * Syncs hotel search snapshots from MySQL to Elasticsearch hotels index.
 * This enables fast full-text search, geospatial queries, and complex filtering.
 *
 * Usage:
 *   - Run directly: node infra/elasticsearch/seeders/hotels_index.seed.js
 *   - npm script: npm run es:seed-hotels
 *
 * Options:
 *   - --clear: Clear all documents from the index before seeding
 *   - --batch-size=N: Number of documents per bulk request (default: 100)
 *   - --hotel-ids=id1,id2: Sync only specific hotel IDs (comma-separated)
 *   - --status=active: Filter by status (active, inactive, suspended)
 *
 * Examples:
 *   node infra/elasticsearch/seeders/hotels_index.seed.js --clear
 *   node infra/elasticsearch/seeders/hotels_index.seed.js --hotel-ids=123,456
 *   node infra/elasticsearch/seeders/hotels_index.seed.js --status=active --batch-size=50
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

// Add module alias support
require('module-alias/register');

const { Op } = require('sequelize');

const elasticsearchClient = require('../../../config/elasticsearch.config');
const db = require('../../../models');

const { hotel_search_snapshots: HotelSearchSnapshots } = db;

const INDEX_NAME = 'hotels';
const DEFAULT_BATCH_SIZE = 100;

/**
 * Calculate popularity score for ranking
 * Formula: (total_bookings * 2) + (view_count * 0.1) + (avg_rating * review_count * 0.5)
 * Returns null if score is 0 (rank_feature doesn't accept 0 values)
 */
function calculatePopularityScore(snapshot) {
  const bookingScore = (snapshot.total_bookings || 0) * 2;
  const viewScore = (snapshot.view_count || 0) * 0.1;
  const ratingScore = (parseFloat(snapshot.avg_rating) || 0) * (snapshot.review_count || 0) * 0.5;

  const score = bookingScore + viewScore + ratingScore;

  // rank_feature type requires positive values, return null for 0 to omit the field
  return score > 0 ? score : null;
}

/**
 * Transform MySQL snapshot record to Elasticsearch document
 */
function transformSnapshotToDocument(snapshot) {
  const doc = {
    hotel_id: snapshot.hotel_id,
    hotel_name: snapshot.hotel_name,
    city: snapshot.city,
    country: snapshot.country,
    latitude: parseFloat(snapshot.latitude),
    longitude: parseFloat(snapshot.longitude),
    min_price: snapshot.min_price ? parseFloat(snapshot.min_price) : null,
    max_price: snapshot.max_price ? parseFloat(snapshot.max_price) : null,
    avg_rating: snapshot.avg_rating ? parseFloat(snapshot.avg_rating) : null,
    review_count: snapshot.review_count || 0,
    hotel_class: snapshot.hotel_class,
    status: snapshot.status,
    amenity_codes: snapshot.amenity_codes || [],
    has_free_cancellation: Boolean(snapshot.has_free_cancellation),
    is_available: Boolean(snapshot.is_available),
    has_available_rooms: Boolean(snapshot.has_available_rooms),
    primary_image_url: snapshot.primary_image_url,
    total_bookings: snapshot.total_bookings || 0,
    view_count: snapshot.view_count || 0,
    created_at: snapshot.created_at,
    updated_at: snapshot.updated_at,
  };

  // Add geo_point location field
  if (doc.latitude && doc.longitude) {
    doc.location = {
      lat: doc.latitude,
      lon: doc.longitude,
    };
  }

  // Calculate and add popularity score (only if > 0, as rank_feature doesn't accept 0)
  const popularityScore = calculatePopularityScore(snapshot);
  if (popularityScore !== null) {
    doc.popularity_score = popularityScore;
  }

  return doc;
}

/**
 * Bulk index documents to Elasticsearch
 */
async function bulkIndexDocuments(documents) {
  if (documents.length === 0) {
    return { indexed: 0, failed: 0 };
  }

  const body = documents.flatMap((doc) => [
    { index: { _index: INDEX_NAME, _id: doc.hotel_id } },
    doc,
  ]);

  try {
    const response = await elasticsearchClient.bulk({ body, refresh: true });

    let indexed = 0;
    let failed = 0;

    if (response.errors) {
      response.items.forEach((item, idx) => {
        if (item.index && item.index.error) {
          failed++;
          console.error(
            `❌ Failed to index document ${documents[idx]?.hotel_id}:`,
            item.index.error
          );
        } else {
          indexed++;
        }
      });
    } else {
      indexed = documents.length;
    }

    return { indexed, failed };
  } catch (error) {
    console.error('❌ Bulk indexing error:', error.message);
    return { indexed: 0, failed: documents.length };
  }
}

/**
 * Clear all documents from the hotels index
 */
async function clearIndex() {
  try {
    console.log(`🗑️  Clearing all documents from index '${INDEX_NAME}'...`);

    const response = await elasticsearchClient.deleteByQuery({
      index: INDEX_NAME,
      body: {
        query: {
          match_all: {},
        },
      },
      refresh: true,
    });

    console.log(`✅ Deleted ${response.deleted} documents`);
    return response.deleted;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      console.log(`⚠️  Index '${INDEX_NAME}' does not exist`);
      return 0;
    }
    throw error;
  }
}

/**
 * Verify index exists
 */
async function verifyIndexExists() {
  const exists = await elasticsearchClient.indices.exists({
    index: INDEX_NAME,
  });

  if (!exists) {
    console.error(`❌ Index '${INDEX_NAME}' does not exist. Run 'npm run es:setup-hotels' first.`);
    return false;
  }

  return true;
}

/**
 * Get total count from Elasticsearch index
 */
async function getIndexCount() {
  try {
    const response = await elasticsearchClient.count({ index: INDEX_NAME });
    return response.count;
  } catch (error) {
    return 0;
  }
}

/**
 * Seed hotels from MySQL to Elasticsearch
 */
async function seedHotelsIndex(options = {}) {
  const {
    hotelIds = null,
    status = null,
    clearExisting = false,
    batchSize = DEFAULT_BATCH_SIZE,
  } = options;

  try {
    console.log('🌱 Starting Elasticsearch hotels index seeding...\n');

    // Verify index exists
    if (!(await verifyIndexExists())) {
      process.exit(1);
    }

    // Clear existing documents if requested
    if (clearExisting) {
      await clearIndex();
    }

    // Build query filters
    const whereClause = {};
    if (hotelIds && hotelIds.length > 0) {
      whereClause.hotel_id = { [Op.in]: hotelIds };
    }
    if (status) {
      whereClause.status = status;
    }

    // Get total count from MySQL
    const totalCount = await HotelSearchSnapshots.count({
      where: whereClause,
    });

    if (totalCount === 0) {
      console.log('⚠️  No snapshots found in MySQL to sync');
      return { indexed: 0, failed: 0, total: 0 };
    }

    console.log(`📊 Found ${totalCount} snapshots to sync from MySQL`);
    console.log(`📦 Batch size: ${batchSize}\n`);

    let indexed = 0;
    let failed = 0;
    let offset = 0;

    // Process in batches
    while (offset < totalCount) {
      const snapshots = await HotelSearchSnapshots.findAll({
        where: whereClause,
        limit: batchSize,
        offset: offset,
        raw: true,
      });

      if (snapshots.length === 0) {
        break;
      }

      // Transform to Elasticsearch documents
      const documents = snapshots.map(transformSnapshotToDocument);

      // Bulk index to Elasticsearch
      const result = await bulkIndexDocuments(documents);
      indexed += result.indexed;
      failed += result.failed;

      offset += snapshots.length;

      // Progress update
      const progress = Math.min(100, ((offset / totalCount) * 100).toFixed(1));
      console.log(
        `📈 Progress: ${offset}/${totalCount} (${progress}%) - Indexed: ${indexed}, Failed: ${failed}`
      );
    }

    // Get final count from Elasticsearch
    const esCount = await getIndexCount();

    console.log('\n✅ Seeding complete!');
    console.log(`   - Total processed: ${totalCount}`);
    console.log(`   - Successfully indexed: ${indexed}`);
    console.log(`   - Failed: ${failed}`);
    console.log(`   - Elasticsearch index count: ${esCount}`);

    return { indexed, failed, total: totalCount };
  } catch (error) {
    console.error('❌ Error seeding hotels index:', error);
    throw error;
  }
}

/**
 * Sync specific hotels by IDs
 */
async function syncHotelsByIds(hotelIds) {
  console.log(`🔄 Syncing specific hotels: ${hotelIds.join(', ')}\n`);

  return await seedHotelsIndex({
    hotelIds,
    clearExisting: false,
    batchSize: hotelIds.length,
  });
}

/**
 * Sync only active hotels
 */
async function syncActiveHotels() {
  console.log('🔄 Syncing only active hotels\n');

  return await seedHotelsIndex({
    status: 'active',
    clearExisting: false,
    batchSize: DEFAULT_BATCH_SIZE,
  });
}

/**
 * Full reindex - clear and rebuild
 */
async function fullReindex() {
  console.log('🔨 Full reindex - clearing and rebuilding index\n');

  return await seedHotelsIndex({
    clearExisting: true,
    batchSize: DEFAULT_BATCH_SIZE,
  });
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);

  const options = {
    clearExisting: args.includes('--clear'),
    batchSize: DEFAULT_BATCH_SIZE,
    hotelIds: null,
    status: null,
  };

  // Parse batch size
  const batchArg = args.find((arg) => arg.startsWith('--batch-size='));
  if (batchArg) {
    const size = parseInt(batchArg.split('=')[1], 10);
    if (!isNaN(size) && size > 0) {
      options.batchSize = size;
    }
  }

  // Parse hotel IDs
  const idsArg = args.find((arg) => arg.startsWith('--hotel-ids='));
  if (idsArg) {
    const ids = idsArg.split('=')[1].split(',').filter(Boolean);
    if (ids.length > 0) {
      options.hotelIds = ids;
    }
  }

  // Parse status filter
  const statusArg = args.find((arg) => arg.startsWith('--status='));
  if (statusArg) {
    options.status = statusArg.split('=')[1];
  }

  return options;
}

// Run from command line
if (require.main === module) {
  (async () => {
    try {
      // Test Elasticsearch connection
      await elasticsearchClient.ping();
      console.log('✅ Elasticsearch connection established\n');

      // Parse command line options
      const options = parseArguments();

      // Run seeding
      await seedHotelsIndex(options);

      await elasticsearchClient.close();
      console.log('\n✅ Elasticsearch connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      try {
        await elasticsearchClient.close();
      } catch (closeError) {
        // Ignore close errors
      }
      process.exit(1);
    }
  })();
}

module.exports = {
  seedHotelsIndex,
  syncHotelsByIds,
  syncActiveHotels,
  fullReindex,
  transformSnapshotToDocument,
  calculatePopularityScore,
};
