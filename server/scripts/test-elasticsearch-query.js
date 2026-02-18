/**
 * Test script to debug Elasticsearch queries
 * Usage: node scripts/test-elasticsearch-query.js
 */

require('module-alias/register');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development',
});

const elasticsearchHelper = require('@helpers/elasticsearch.helper');
const logger = require('@config/logger.config');

async function testElasticsearchQuery() {
  try {
    logger.info('Testing Elasticsearch query...\n');

    // Test parameters
    const testParams = {
      city: 'Irving',
      checkIn: '2026-03-01',
      checkOut: '2026-03-03',
      adults: 2,
      children: 0,
      rooms: 1,
      page: 1,
      limit: 10,
      sortBy: 'relevance',
    };

    logger.info('Test parameters:', testParams);

    // Check if ES is available
    const isAvailable = await elasticsearchHelper.isAvailable();
    logger.info(`Elasticsearch available: ${isAvailable}\n`);

    if (!isAvailable) {
      logger.error('Elasticsearch is not available. Please check your connection.');
      process.exit(1);
    }

    // Build query
    const esQuery = elasticsearchHelper.buildSearchQuery(testParams);
    logger.info('Generated Elasticsearch query:');
    console.log(JSON.stringify(esQuery, null, 2));
    console.log('\n');

    // Execute search
    logger.info('Executing search...');
    const results = await elasticsearchHelper.search(esQuery);

    logger.info(`\nFound ${results.length} results:`);
    results.forEach((hotel, index) => {
      console.log(`\n${index + 1}. ${hotel.hotel_name}`);
      console.log(`   City: ${hotel.city}, ${hotel.country}`);
      console.log(`   Rating: ${hotel.avg_rating} (${hotel.review_count} reviews)`);
      console.log(`   Price range: $${hotel.min_price} - $${hotel.max_price}`);
      console.log(`   Class: ${hotel.hotel_class} stars`);
      console.log(`   Available: ${hotel.is_available}, Has rooms: ${hotel.has_available_rooms}`);
      console.log(`   Score: ${hotel._score}`);
    });

    logger.info('\n✓ Test completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Test failed:', error);
    console.error(error);
    process.exit(1);
  }
}

testElasticsearchQuery();
