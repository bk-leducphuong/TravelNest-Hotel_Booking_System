const { Client, logLevel } = require('@elastic/elasticsearch');
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
  log: process.env.NODE_ENV === 'development',
  logLevel: logLevel.ERROR, // Avoid flooding logs in production
  requestTimeout: 30000,
  tls: {
    rejectUnauthorized: false,
  },
  maxRetries: 5,
  retryOnStatusCode: (statusCode) => statusCode >= 500,
});

module.exports = elasticsearchClient;
