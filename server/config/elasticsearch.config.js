const { Client } = require('@elastic/elasticsearch');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const createUnavailableClient = () => {
  const unavailableError = () =>
    new Error('Elasticsearch is not configured. Set ELASTICSEARCH_ENDPOINT to enable it.');

  const proxyTarget = () => {};

  const proxy = new Proxy(proxyTarget, {
    get(target, property) {
      if (property === 'then') {
        return undefined;
      }

      if (property === 'close') {
        return async () => {};
      }

      return proxy;
    },
    apply() {
      throw unavailableError();
    },
  });

  return proxy;
};

const elasticsearchEndpoint = process.env.ELASTICSEARCH_ENDPOINT || process.env.ELASTICSEARCH_HOSTS;
const elasticsearchApiKey = process.env.ELASTICSEARCH_API_KEY;
const elasticsearchUsername = process.env.ELASTICSEARCH_USERNAME;
const elasticsearchPassword = process.env.ELASTICSEARCH_PASSWORD;

const getElasticsearchAuth = () => {
  if (elasticsearchApiKey) {
    return { apiKey: elasticsearchApiKey };
  }

  if (elasticsearchUsername && elasticsearchPassword) {
    return {
      username: elasticsearchUsername,
      password: elasticsearchPassword,
    };
  }

  return undefined;
};

const elasticsearchAuth = getElasticsearchAuth();

const elasticsearchClient = elasticsearchEndpoint
  ? new Client({
      node: elasticsearchEndpoint,
      ...(elasticsearchAuth ? { auth: elasticsearchAuth } : {}),
      log: 'error',
      requestTimeout: 30000,
      tls: {
        rejectUnauthorized: process.env.ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED !== 'false',
      },
      maxRetries: 5,
      retryOnStatusCode: (statusCode) => statusCode >= 500,
    })
  : createUnavailableClient();

module.exports = elasticsearchClient;
