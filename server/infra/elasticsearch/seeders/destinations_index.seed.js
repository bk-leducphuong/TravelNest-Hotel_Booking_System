/**
 * Elasticsearch Destinations Index Seeder
 *
 * Syncs destinations from MySQL to Elasticsearch destinations index.
 *
 * Usage:
 *   - Run directly: node infra/elasticsearch/seeders/destinations_index.seed.js
 *   - npm script: npm run es:seed-destinations
 *
 * Options:
 *   - --clear: Clear all documents from the index before seeding
 *   - --batch-size=N: Number of documents per bulk request (default: 200)
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

require('module-alias/register');

const elasticsearchClient = require('../../../config/elasticsearch.config');
const db = require('../../../models');

const { destinations: Destinations } = db;

const INDEX_NAME = 'destinations';
const DEFAULT_BATCH_SIZE = 200;

function transformDestinationToDocument(destination) {
  return {
    id: destination.id,
    type: destination.type,
    city_id: destination.city_id,
    country_id: destination.country_id,
    display_name: destination.display_name,
    normalized_name: destination.normalized_name,
    slug: destination.slug,
    country_name: destination.country_name,
    is_active: Boolean(destination.is_active),
    created_at: destination.created_at,
    updated_at: destination.updated_at,
  };
}

async function bulkIndexDocuments(documents) {
  if (documents.length === 0) {
    return { indexed: 0, failed: 0 };
  }

  const body = documents.flatMap((doc) => [{ index: { _index: INDEX_NAME, _id: doc.id } }, doc]);

  const response = await elasticsearchClient.bulk({ body, refresh: true });

  let indexed = 0;
  let failed = 0;

  if (response.errors) {
    response.items.forEach((item, idx) => {
      if (item.index && item.index.error) {
        failed++;
        console.error(`❌ Failed to index destination ${documents[idx]?.id}:`, item.index.error);
      } else {
        indexed++;
      }
    });
  } else {
    indexed = documents.length;
  }

  return { indexed, failed };
}

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

async function verifyIndexExists() {
  const exists = await elasticsearchClient.indices.exists({
    index: INDEX_NAME,
  });

  if (!exists) {
    console.error(
      `❌ Index '${INDEX_NAME}' does not exist. Run 'npm run es:setup-destinations' first.`
    );
    return false;
  }

  return true;
}

async function getIndexCount() {
  try {
    const response = await elasticsearchClient.count({ index: INDEX_NAME });
    return response.count;
  } catch {
    return 0;
  }
}

async function seedDestinationsIndex(options = {}) {
  const { clearExisting = false, batchSize = DEFAULT_BATCH_SIZE } = options;

  console.log('🌱 Starting Elasticsearch destinations index seeding...\n');

  if (!(await verifyIndexExists())) {
    process.exit(1);
  }

  if (clearExisting) {
    await clearIndex();
  }

  const totalCount = await Destinations.count({
    where: { is_active: true },
  });

  if (totalCount === 0) {
    console.log('⚠️  No destinations found in MySQL to sync');
    return { indexed: 0, failed: 0, total: 0 };
  }

  console.log(`📊 Found ${totalCount} active destinations to sync`);
  console.log(`📦 Batch size: ${batchSize}\n`);

  let indexed = 0;
  let failed = 0;
  let offset = 0;

  while (offset < totalCount) {
    const destinations = await Destinations.findAll({
      where: { is_active: true },
      limit: batchSize,
      offset,
      raw: true,
    });

    if (destinations.length === 0) break;

    const documents = destinations.map(transformDestinationToDocument);
    const result = await bulkIndexDocuments(documents);

    indexed += result.indexed;
    failed += result.failed;
    offset += destinations.length;

    const progress = Math.min(100, ((offset / totalCount) * 100).toFixed(1));
    console.log(
      `📈 Progress: ${offset}/${totalCount} (${progress}%) - Indexed: ${indexed}, Failed: ${failed}`
    );
  }

  const esCount = await getIndexCount();

  console.log('\n✅ Destinations seeding complete!');
  console.log(`   - Total processed: ${totalCount}`);
  console.log(`   - Successfully indexed: ${indexed}`);
  console.log(`   - Failed: ${failed}`);
  console.log(`   - Elasticsearch index count: ${esCount}`);

  return { indexed, failed, total: totalCount };
}

function parseArguments() {
  const args = process.argv.slice(2);

  const options = {
    clearExisting: args.includes('--clear'),
    batchSize: DEFAULT_BATCH_SIZE,
  };

  const batchArg = args.find((arg) => arg.startsWith('--batch-size='));
  if (batchArg) {
    const size = parseInt(batchArg.split('=')[1], 10);
    if (!Number.isNaN(size) && size > 0) {
      options.batchSize = size;
    }
  }

  return options;
}

if (require.main === module) {
  (async () => {
    try {
      await elasticsearchClient.ping();
      console.log('✅ Elasticsearch connection established\n');

      const options = parseArguments();
      await seedDestinationsIndex(options);

      await elasticsearchClient.close();
      console.log('\n✅ Elasticsearch connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Destinations seeding failed:', error);
      try {
        await elasticsearchClient.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}

module.exports = {
  seedDestinationsIndex,
};
