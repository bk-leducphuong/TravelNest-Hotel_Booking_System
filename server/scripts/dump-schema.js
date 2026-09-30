/* eslint-disable no-console */
/**
 * Dump the MySQL schema to a canonical SQL file.
 *
 * Usage:
 *   node scripts/dump-schema.js --from-sync           # dump what the Sequelize models produce
 *   node scripts/dump-schema.js --database travelnest # dump an existing database
 *   node scripts/dump-schema.js --from-sync --out infra/database/schema/baseline.sql
 *
 * `--from-sync` is what generates `infra/database/schema/baseline.sql`. It creates
 * a throwaway database, runs `sequelize.sync({ force: true })` against it, dumps the
 * resulting DDL and removes the throwaway database. The output is the source of
 * truth applied by the baseline migration, so the schema is reproducible from the
 * repository without ever running `sequelize.sync` in a real environment again.
 */
const fs = require('fs');
const path = require('path');

const mysql = require('mysql2/promise');

const { getConnectionConfig } = require('../config/database.options');

const SERVER_ROOT = path.resolve(__dirname, '..');
const SCHEMA_DIR = path.join(SERVER_ROOT, 'infra', 'database', 'schema');
const DEFAULT_OUT = path.join(SCHEMA_DIR, 'baseline.sql');
const STATEMENT_SEPARATOR = '-- @@schema-statement@@';

function parseArgs(argv) {
  const args = { fromSync: false, out: DEFAULT_OUT, database: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--from-sync') {
      args.fromSync = true;
    } else if (arg === '--out') {
      args.out = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
    } else if (arg === '--database') {
      args.database = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

/**
 * Credentials with CREATE DATABASE rights. Falls back to the application
 * credentials (which is enough in CI, where DB_USER is typically root). In the
 * local docker-compose the app user is `admin` and only root can create
 * databases, so set DB_ADMIN_USER=root locally.
 */
function adminParts() {
  const conn = getConnectionConfig();
  return {
    host: conn.host,
    port: conn.port,
    user: process.env.DB_ADMIN_USER || conn.username,
    password: process.env.DB_ADMIN_PASSWORD || conn.password,
  };
}

function appParts() {
  const conn = getConnectionConfig();
  return {
    host: conn.host,
    port: conn.port,
    user: conn.username,
    password: conn.password,
  };
}

async function withServerConnection(parts, fn) {
  const connection = await mysql.createConnection({
    ...parts,
    multipleStatements: true,
  });
  try {
    return await fn(connection);
  } finally {
    await connection.end();
  }
}

async function createDatabase(database) {
  await withServerConnection(adminParts(), async (connection) => {
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await connection.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  });
}

async function dropDatabase(database) {
  await withServerConnection(adminParts(), async (connection) => {
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  });
}

function normalizeDdl(ddl) {
  return ddl
    .replace(/^CREATE TABLE /i, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/\s+AUTO_INCREMENT=\d+\s*/i, ' ');
}

async function dumpDatabase(database, parts = appParts()) {
  const connection = await mysql.createConnection({
    ...parts,
    database,
  });

  try {
    const [tables] = await connection.query(
      `SELECT TABLE_NAME AS tableName
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME`,
      [database]
    );

    const statements = [];
    for (const { tableName } of tables) {
      if (tableName === 'SequelizeMeta') {
        continue;
      }
      const [rows] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      const ddl = normalizeDdl(rows[0]['Create Table']);
      statements.push(`-- ${tableName}\n${ddl}`);
    }

    const header = [
      '-- TravelNest canonical baseline schema (MySQL 8).',
      '--',
      '-- GENERATED FILE - do not edit by hand.',
      `-- Regenerate with: node scripts/dump-schema.js --from-sync --out ${path.relative(
        SERVER_ROOT,
        DEFAULT_OUT
      )}`,
      '--',
      `-- Statements are separated by a line containing only: ${STATEMENT_SEPARATOR}`,
      '',
    ].join('\n');

    return `${header}\n${statements.join(`\n${STATEMENT_SEPARATOR}\n`)}\n`;
  } finally {
    await connection.end();
  }
}

async function dumpFromSync(outPath) {
  const base = getConnectionConfig();
  const admin = adminParts();
  const scratch = `${base.database}_schema_dump`;

  console.log(`Creating throwaway database ${scratch}...`);
  await createDatabase(scratch);

  try {
    // Point the models at the throwaway database, using the same credentials
    // that created it (the app user may not have been granted access to it).
    process.env.DB_NAME = scratch;
    process.env.DB_USER = admin.user;
    process.env.DB_PASSWORD = admin.password;

    // Require models only after DB_NAME points at the throwaway database.
    const db = require('../models');

    console.log('Running sequelize.sync({ force: true }) from the models...');
    await db.sequelize.authenticate();
    await db.sequelize.sync({ force: true, logging: false });

    console.log(`Dumping schema from ${scratch}...`);
    const sql = await dumpDatabase(scratch, admin);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, sql);
    console.log(`Wrote ${path.relative(SERVER_ROOT, outPath)}`);

    await db.sequelize.close();
  } finally {
    console.log(`Dropping throwaway database ${scratch}...`);
    await dropDatabase(scratch);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.fromSync) {
    await dumpFromSync(args.out);
    return;
  }

  const database = args.database || getConnectionConfig().database;
  console.log(`Dumping schema of existing database ${database}...`);
  const sql = await dumpDatabase(database);
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, sql);
  console.log(`Wrote ${path.relative(SERVER_ROOT, args.out)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

module.exports = { dumpDatabase, STATEMENT_SEPARATOR };
