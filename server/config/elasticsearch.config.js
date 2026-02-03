const { Client } = require('@elastic/elasticsearch');
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_HOSTS,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
});

module.exports = elasticsearchClient;
