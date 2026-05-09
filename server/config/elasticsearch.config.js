const { Client } = require('@elastic/elasticsearch');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const createUnavailableClient = () => {
  const unavailableError = () =>
    new Error('Elasticsearch is not configured. Set ELASTICSEARCH_HOSTS to enable it.');

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

const elasticsearchHosts = process.env.ELASTICSEARCH_HOSTS;

const elasticsearchClient = elasticsearchHosts
  ? new Client({
      node: elasticsearchHosts,
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
    })
  : createUnavailableClient();

module.exports = elasticsearchClient;
