require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const mongoose = require('mongoose');
const logger = require('./logger.config');

const DEFAULT_DATABASE = 'travelnest_analytics';

function buildMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const database = process.env.MONGODB_DATABASE || DEFAULT_DATABASE;
  const username = process.env.MONGODB_USERNAME || '';
  const password = process.env.MONGODB_PASSWORD || '';
  const credentials =
    username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';

  return `mongodb://${credentials}${host}:${port}/${database}`;
}

const mongoConnection = {
  uri: buildMongoUri(),
  database: process.env.MONGODB_DATABASE || DEFAULT_DATABASE,
};

let connectionPromise = null;

const connect = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoConnection.uri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
      })
      .then(() => {
        logger.info('MongoDB client initialized', {
          database: mongoose.connection.name || mongoConnection.database,
          host: mongoose.connection.host,
        });
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        logger.error('MongoDB connection failed', { error: error.message });
        throw error;
      });
  }

  return connectionPromise;
};

const ping = async () => {
  try {
    await connect();
    const result = await mongoose.connection.db.admin().ping();
    return result?.ok === 1;
  } catch (error) {
    logger.error('MongoDB ping failed', { error: error.message });
    return false;
  }
};

const close = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectionPromise = null;
    logger.info('MongoDB client closed');
  }
};

module.exports = {
  connect,
  ping,
  close,
  getConnection: () => mongoose.connection,
  mongoConnection,
};
