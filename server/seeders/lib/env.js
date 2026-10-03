/**
 * Environment + path helpers for the fast seed pipeline.
 *
 * The pipeline talks to MySQL through raw `mysql2` connections (not Sequelize)
 * so that it can stream rows in with `LOAD DATA LOCAL INFILE`. It therefore
 * resolves its own connection settings from the same `.env.<NODE_ENV>` file the
 * application uses.
 */

const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');

const nodeEnv = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, '..', '..', `.env.${nodeEnv}`);

if (fs.existsSync(envPath)) {
  // dotenv does not override variables already present in process.env.
  dotenv.config({ path: envPath });
}

// Scratch space for parent-id manifests and other fast-seed artifacts.
const TMP_DIR = path.resolve(__dirname, '..', '.seed-tmp');

/**
 * Resolve the MySQL connection settings for a seeder process.
 * `admin: true` prefers DB_ADMIN_USER (root) which is required for
 * `SET sql_log_bin = 0`.
 * @param {{ admin?: boolean }} [options]
 */
function getDbConfig({ admin = true } = {}) {
  const user = admin
    ? process.env.DB_ADMIN_USER || process.env.DB_USER || 'user'
    : process.env.DB_USER || 'user';

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT, 10) || 3306,
    user,
    // The dev docker MySQL sets MYSQL_ROOT_PASSWORD/MYSQL_PASSWORD to DB_PASSWORD.
    password: process.env.DB_PASSWORD || '123',
    database: process.env.DB_NAME || 'travelnest',
  };
}

function ensureTmpDir() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  return TMP_DIR;
}

module.exports = {
  TMP_DIR,
  ensureTmpDir,
  getDbConfig,
  nodeEnv,
};
