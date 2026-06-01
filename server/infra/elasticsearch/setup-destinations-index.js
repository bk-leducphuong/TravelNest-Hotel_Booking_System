const path = require('path');
const fs = require('fs');

const logger = require('../../config/logger.config');
const elasticsearchClient = require('../../config/elasticsearch.config');

const INDEX_NAME = 'destinations';
const SERVERLESS_UNSUPPORTED_INDEX_SETTINGS = ['number_of_shards', 'number_of_replicas'];

function isServerlessUnsupportedSettingsError(error) {
  const reason = error?.meta?.body?.error?.reason || error?.message || '';

  return SERVERLESS_UNSUPPORTED_INDEX_SETTINGS.every((setting) => reason.includes(setting));
}

function removeServerlessUnsupportedSettings(mapping) {
  const serverlessMapping = {
    ...mapping,
    settings: {
      ...mapping.settings,
    },
  };

  for (const setting of SERVERLESS_UNSUPPORTED_INDEX_SETTINGS) {
    delete serverlessMapping.settings[setting];
  }

  return serverlessMapping;
}

async function createDestinationsIndex(mapping) {
  try {
    await elasticsearchClient.indices.create({
      index: INDEX_NAME,
      body: mapping,
    });
  } catch (error) {
    if (!isServerlessUnsupportedSettingsError(error)) {
      throw error;
    }

    console.log(
      'Elasticsearch serverless does not allow shard/replica settings. Retrying without those settings...'
    );

    await elasticsearchClient.indices.create({
      index: INDEX_NAME,
      body: removeServerlessUnsupportedSettings(mapping),
    });
  }
}

async function setupDestinationsIndex({ force = false } = {}) {
  try {
    console.log(`Checking if index '${INDEX_NAME}' exists...`);

    const indexExists = await elasticsearchClient.indices.exists({
      index: INDEX_NAME,
    });

    if (indexExists) {
      if (force) {
        console.log(`Deleting existing index '${INDEX_NAME}'...`);
        await elasticsearchClient.indices.delete({ index: INDEX_NAME });
        console.log(`Index '${INDEX_NAME}' deleted.`);
      } else {
        console.log(`Index '${INDEX_NAME}' already exists. Use --force to recreate.`);
        return;
      }
    }

    const mappingFile = path.join(__dirname, 'mapping', 'destinations-mapping.json');
    const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));

    console.log(`Creating index '${INDEX_NAME}'...`);
    await createDestinationsIndex(mapping);

    console.log(`Index '${INDEX_NAME}' created successfully!`);

    const indexInfo = await elasticsearchClient.indices.get({
      index: INDEX_NAME,
    });

    logger.info(
      {
        index: INDEX_NAME,
        settings: indexInfo[INDEX_NAME].settings,
      },
      'Destinations index created'
    );
  } catch (error) {
    console.error(`Failed to setup index '${INDEX_NAME}':`, error);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure Elasticsearch is running: docker ps | grep elasticsearch');
    console.error('  2. Check connection: curl http://localhost:9200');
    console.error('  3. Verify credentials in .env file');
    console.error('  4. Check Elasticsearch logs: docker logs elasticsearch');
    process.exit(1);
  } finally {
    await elasticsearchClient.close();
  }
}

if (require.main === module) {
  (async () => {
    const force = process.argv.includes('--force');
    await setupDestinationsIndex({ force });
  })();
}

module.exports = {
  setupDestinationsIndex,
};
