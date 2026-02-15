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

const INDEX_PATTERN = 'travelnest-logs';
const INDEX_TEMPLATE_NAME = 'travelnest-logs-template';

async function setupLogsIndex() {
  try {
    console.log(
      `Setting up Elasticsearch index template for '${INDEX_PATTERN}'...\n`
    );

    // Read the mapping file
    const mappingFile = path.join(__dirname, 'mapping/logs-mapping.json');
    if (!fs.existsSync(mappingFile)) {
      throw new Error(`Mapping file not found: ${mappingFile}`);
    }

    const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));

    // Check if template already exists
    const templateExists =
      await elasticsearchClient.indices.existsIndexTemplate({
        name: INDEX_TEMPLATE_NAME,
      });

    if (templateExists) {
      console.log(`Index template '${INDEX_TEMPLATE_NAME}' already exists.`);

      const deleteExisting = process.argv.includes('--force');

      if (deleteExisting) {
        console.log(`Deleting existing template '${INDEX_TEMPLATE_NAME}'...`);
        await elasticsearchClient.indices.deleteIndexTemplate({
          name: INDEX_TEMPLATE_NAME,
        });
        console.log(`Template '${INDEX_TEMPLATE_NAME}' deleted.\n`);
      } else {
        console.log('Use --force flag to delete and recreate the template.');
        console.log('\nTo update the template, run:');
        console.log(`  node setup-logs-index.js --force\n`);
        process.exit(0);
      }
    }

    // Create index template
    console.log(`Creating index template '${INDEX_TEMPLATE_NAME}'...`);

    await elasticsearchClient.indices.putIndexTemplate({
      name: INDEX_TEMPLATE_NAME,
      body: {
        index_patterns: [`${INDEX_PATTERN}-*`],
        template: {
          settings: mapping.settings,
          mappings: mapping.mappings,
        },
        priority: 500,
        version: 1,
        _meta: {
          description: 'Template for TravelNest application logs',
          created_at: new Date().toISOString(),
        },
      },
    });

    console.log(
      `✓ Index template '${INDEX_TEMPLATE_NAME}' created successfully!\n`
    );

    // Get template info
    const templateInfo = await elasticsearchClient.indices.getIndexTemplate({
      name: INDEX_TEMPLATE_NAME,
    });

    console.log('Template configuration:');
    console.log('  Pattern:', `${INDEX_PATTERN}-*`);
    console.log('  Shards:', mapping.settings.number_of_shards);
    console.log('  Replicas:', mapping.settings.number_of_replicas);
    console.log('  Refresh interval:', mapping.settings.index.refresh_interval);
    console.log('  Codec:', mapping.settings.index.codec);

    // Count mapped properties
    const propertyCount = Object.keys(mapping.mappings.properties).length;
    console.log('  Mapped fields:', propertyCount);

    console.log('\n✓ Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Start Filebeat to ship logs to Logstash');
    console.log(
      '  2. Logstash will automatically create indices matching the pattern'
    );
    console.log(`  3. View logs in Kibana: http://localhost:5601`);
    console.log(
      `  4. Query logs via API: http://localhost:9200/${INDEX_PATTERN}-*/_search`
    );

    // Optionally create the first index
    if (process.argv.includes('--create-index')) {
      const today = new Date().toISOString().split('T')[0];
      const indexName = `${INDEX_PATTERN}-${today}`;

      console.log(`\nCreating initial index '${indexName}'...`);

      const indexExists = await elasticsearchClient.indices.exists({
        index: indexName,
      });

      if (!indexExists) {
        await elasticsearchClient.indices.create({
          index: indexName,
        });
        console.log(`✓ Index '${indexName}' created successfully!`);
      } else {
        console.log(`Index '${indexName}' already exists.`);
      }
    } else {
      console.log(
        '\nUse --create-index flag to create the first index immediately.'
      );
    }
  } catch (error) {
    console.error('\n✗ Error setting up logs index template:');

    if (error.meta?.body) {
      console.error(
        'Elasticsearch error:',
        JSON.stringify(error.meta.body, null, 2)
      );
    } else {
      console.error(error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    }

    console.error('\nTroubleshooting:');
    console.error(
      '  1. Ensure Elasticsearch is running: docker ps | grep elasticsearch'
    );
    console.error('  2. Check connection: curl http://localhost:9200');
    console.error('  3. Verify credentials in .env file');
    console.error('  4. Check Elasticsearch logs: docker logs elasticsearch');

    process.exit(1);
  } finally {
    await elasticsearchClient.close();
  }
}

// Run the setup
setupLogsIndex();
