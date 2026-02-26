require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

module.exports = {
  development: {
    username: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || '123',
    database: process.env.DB_NAME || 'travelnest',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  test: {
    username: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || '123',
    database: process.env.DB_NAME ? `${process.env.DB_NAME}_test` : 'travelnest_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || '123',
    database: process.env.DB_NAME ? `${process.env.DB_NAME}_prod` : 'travelnest_prod',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
