const fs = require('fs');
const path = require('path');

const elasticsearchClient = require('../../config/elasticsearch.config');

const INDEX_NAME = 'hotels';
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

async function createHotelsIndex(mapping) {
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

async function setupHotelsIndex() {
  try {
    console.log(`Checking if index '${INDEX_NAME}' exists...`);

    const indexExists = await elasticsearchClient.indices.exists({
      index: INDEX_NAME,
    });

    if (indexExists) {
      console.log(`Index '${INDEX_NAME}' already exists.`);

      const deleteExisting = process.argv.includes('--force');

      if (deleteExisting) {
        console.log(`Deleting existing index '${INDEX_NAME}'...`);
        await elasticsearchClient.indices.delete({ index: INDEX_NAME });
        console.log(`Index '${INDEX_NAME}' deleted.`);
      } else {
        console.log('Use --force flag to delete and recreate the index.');
        process.exit(0);
      }
    }

    console.log(`Creating index '${INDEX_NAME}'...`);

    const mappingFile = path.join(__dirname, 'mapping/hotels-mapping.json');
    const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));

    await createHotelsIndex(mapping);

    console.log(`Index '${INDEX_NAME}' created successfully!`);

    const indexInfo = await elasticsearchClient.indices.get({
      index: INDEX_NAME,
    });

    console.log('Index configuration:', JSON.stringify(indexInfo, null, 2));
  } catch (error) {
    console.error('Error setting up hotels index:', error);
    process.exit(1);
  } finally {
    await elasticsearchClient.close();
  }
}

setupHotelsIndex();
