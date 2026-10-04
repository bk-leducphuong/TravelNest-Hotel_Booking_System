/**
 * Elasticsearch search-index helpers for `seed:all`.
 *
 * Creates the `hotels` / `destinations` indices if they are missing and then
 * syncs the MySQL data into them. Everything is best-effort: if Elasticsearch is
 * not running the caller is expected to skip these steps rather than fail the
 * whole seed.
 *
 * Index creation is done with the shared client + the mapping files rather than
 * the `infra/elasticsearch/setup-*.js` scripts, because those scripts call
 * `process.exit()` and cannot be safely invoked in-process.
 */

const fs = require('fs');
const path = require('path');

const elasticsearchClient = require('../../config/elasticsearch.config');
const { seedDestinationsIndex } = require('../elasticsearch/destinations_index.seed');
const { seedHotelsIndex } = require('../elasticsearch/hotels_index.seed');

const MAPPING_DIR = path.join(__dirname, '..', '..', 'infra', 'elasticsearch', 'mapping');
const INDEX_MAPPINGS = {
  destinations: 'destinations-mapping.json',
  hotels: 'hotels-mapping.json',
};

const SEARCH_INDICES = Object.keys(INDEX_MAPPINGS);

/**
 * Is Elasticsearch reachable?
 */
async function isAvailable() {
  try {
    await elasticsearchClient.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Create an index from its mapping file if it does not exist yet.
 * @returns {Promise<boolean>} true when the index was created
 */
async function ensureIndex(index) {
  const exists = await elasticsearchClient.indices.exists({ index });
  if (exists) {
    return false;
  }

  const mappingFile = path.join(MAPPING_DIR, INDEX_MAPPINGS[index]);
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
  await elasticsearchClient.indices.create({ index, body: mapping });

  return true;
}

async function ensureIndices(indices = SEARCH_INDICES) {
  const created = [];

  for (const index of indices) {
    if (await ensureIndex(index)) {
      created.push(index);
    }
  }

  return created;
}

/**
 * Create any missing indices and sync destinations + hotels.
 * @param {{ batchSize?: number, log?: Function }} [options]
 */
async function seedSearchIndices({ batchSize = 200, log = console.log } = {}) {
  const created = await ensureIndices();
  if (created.length > 0) {
    log(`   🆕 Created Elasticsearch index(es): ${created.join(', ')}`);
  }

  const destinations = await seedDestinationsIndex({ batchSize });
  const hotels = await seedHotelsIndex({ batchSize });

  return {
    destinations: destinations.indexed,
    hotels: hotels.indexed,
  };
}

async function close() {
  try {
    await elasticsearchClient.close();
  } catch {
    // nothing to do
  }
}

module.exports = {
  SEARCH_INDICES,
  close,
  ensureIndex,
  ensureIndices,
  isAvailable,
  seedSearchIndices,
};
