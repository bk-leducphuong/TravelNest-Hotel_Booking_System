const { Client } = require('@elastic/elasticsearch');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_HOSTS,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
  log: 'error',
  requestTimeout: 30000,
  tls: {
    rejectUnauthorized: false,
  },
  maxRetries: 5,
  retryOnStatusCode: (statusCode) => statusCode >= 500,
});

module.exports = elasticsearchClient;
