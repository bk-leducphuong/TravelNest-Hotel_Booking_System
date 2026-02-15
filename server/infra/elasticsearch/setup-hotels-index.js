const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const path = require('path');
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});
const logger = require('../../config/logger.config');
const elasticsearchClient = require('../../config/elasticsearch.config');

const INDEX_NAME = 'hotels';

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

    await elasticsearchClient.indices.create({
      index: INDEX_NAME,
      body: mapping,
    });

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
