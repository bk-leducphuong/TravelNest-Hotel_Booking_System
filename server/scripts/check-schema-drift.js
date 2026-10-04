/* eslint-disable no-console */
/**
 * Schema drift check.
 *
 * Verifies that applying the migrations to an empty database produces the same
 * schema as the Sequelize models. This is the guard that makes migrations the
 * single source of truth: if someone changes a model without adding a migration,
 * the two schemas diverge and this check fails.
 *
 * It builds two throwaway databases on the configured MySQL server:
 *   - <DB_NAME>_migrated_check : built only by `sequelize-cli db:migrate`
 *   - <DB_NAME>_models_check   : built only by `sequelize.sync({ force: true })`
 * then compares tables and columns. Both databases are dropped afterwards.
 *
 * Requires CREATE DATABASE rights (DB_ADMIN_USER / DB_ADMIN_PASSWORD, defaulting
 * to DB_USER / DB_PASSWORD).
 */
const { execFileSync } = require('child_process');
const path = require('path');

const mysql = require('mysql2/promise');

const { getConnectionConfig } = require('../config/database.options');

const SERVER_ROOT = path.resolve(__dirname, '..');
const IGNORED_TABLES = new Set(['SequelizeMeta']);

function adminParts() {
  const conn = getConnectionConfig();
  return {
    host: conn.host,
    port: conn.port,
    user: process.env.DB_ADMIN_USER || conn.username,
    password: process.env.DB_ADMIN_PASSWORD || conn.password,
  };
}

function childEnv(database) {
  const admin = adminParts();
  return {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_NAME: database,
    DB_USER: admin.user,
    DB_PASSWORD: admin.password,
  };
}

async function withServerConnection(fn) {
  const connection = await mysql.createConnection({
    ...adminParts(),
    multipleStatements: true,
  });
  try {
    return await fn(connection);
  } finally {
    await connection.end();
  }
}

async function createDatabase(database) {
  await withServerConnection(async (connection) => {
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await connection.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  });
}

async function dropDatabase(database) {
  await withServerConnection(async (connection) => {
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  });
}

function buildModelsSchema(database) {
  console.log(`  building ${database} from models (sequelize.sync)...`);
  execFileSync(
    process.execPath,
    [
      '-e',
      "require('./models').sequelize.sync({ force: true, logging: false })" +
        '.then(() => process.exit(0))' +
        '.catch((error) => { console.error(error); process.exit(1); })',
    ],
    { cwd: SERVER_ROOT, env: childEnv(database), stdio: 'inherit' }
  );
}

function buildMigratedSchema(database) {
  console.log(`  building ${database} from migrations (sequelize-cli db:migrate)...`);
  const sequelizeBin = require.resolve('sequelize-cli/lib/sequelize');
  execFileSync(process.execPath, [sequelizeBin, 'db:migrate'], {
    cwd: SERVER_ROOT,
    env: childEnv(database),
    stdio: 'inherit',
  });
}

async function loadSchema(database) {
  const connection = await mysql.createConnection({ ...adminParts(), database });
  try {
    const [tables] = await connection.query(
      `SELECT TABLE_NAME AS tableName
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [database]
    );

    const [columns] = await connection.query(
      `SELECT TABLE_NAME AS tableName,
              COLUMN_NAME AS columnName,
              COLUMN_TYPE AS columnType,
              IS_NULLABLE AS isNullable
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?`,
      [database]
    );

    const [indexes] = await connection.query(
      `SELECT TABLE_NAME AS tableName,
              INDEX_NAME AS indexName,
              NON_UNIQUE AS nonUnique,
              GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ?
        GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE`,
      [database]
    );

    const tableSet = new Set(
      tables.map((t) => t.tableName).filter((name) => !IGNORED_TABLES.has(name))
    );
    const columnMap = new Map();
    for (const column of columns) {
      if (IGNORED_TABLES.has(column.tableName)) {
        continue;
      }
      columnMap.set(`${column.tableName}.${column.columnName}`, column);
    }

    // Index signatures ignore index names (Sequelize and migrations name them
    // differently) and compare only the column set + uniqueness.
    const indexSignatures = new Map();
    const namesBySignature = new Map();
    for (const index of indexes) {
      if (IGNORED_TABLES.has(index.tableName)) {
        continue;
      }
      const kind = Number(index.nonUnique) === 0 ? 'UNIQUE' : 'INDEX';
      const signature = `${kind}(${index.columns})`;
      if (!indexSignatures.has(index.tableName)) {
        indexSignatures.set(index.tableName, new Set());
      }
      indexSignatures.get(index.tableName).add(signature);

      const key = `${index.tableName}::${signature}`;
      if (!namesBySignature.has(key)) {
        namesBySignature.set(key, []);
      }
      namesBySignature.get(key).push(index.indexName);
    }

    const duplicateIndexes = [];
    for (const [key, names] of namesBySignature) {
      if (names.length > 1) {
        const [table, signature] = key.split('::');
        duplicateIndexes.push({ table, signature, names });
      }
    }

    return { tableSet, columnMap, indexSignatures, duplicateIndexes };
  } finally {
    await connection.end();
  }
}

function describeColumn(column) {
  return `${column.columnType}${column.isNullable === 'NO' ? ' NOT NULL' : ' NULL'}`;
}

function diffSchemas(migrated, models) {
  const problems = [];

  for (const table of models.tableSet) {
    if (!migrated.tableSet.has(table)) {
      problems.push(`table missing from migrations: ${table}`);
    }
  }
  for (const table of migrated.tableSet) {
    if (!models.tableSet.has(table)) {
      problems.push(`table not defined by any model: ${table}`);
    }
  }

  for (const [key, modelColumn] of models.columnMap) {
    const migratedColumn = migrated.columnMap.get(key);
    if (!migratedColumn) {
      problems.push(`column missing from migrations: ${key} (${describeColumn(modelColumn)})`);
      continue;
    }
    if (
      migratedColumn.columnType !== modelColumn.columnType ||
      migratedColumn.isNullable !== modelColumn.isNullable
    ) {
      problems.push(
        `column differs: ${key} - migrations=${describeColumn(
          migratedColumn
        )} models=${describeColumn(modelColumn)}`
      );
    }
  }

  for (const key of migrated.columnMap.keys()) {
    if (!models.columnMap.has(key)) {
      problems.push(`column not defined by any model: ${key}`);
    }
  }

  for (const [table, modelSignatures] of models.indexSignatures) {
    const migratedSignatures = migrated.indexSignatures.get(table) || new Set();
    for (const signature of modelSignatures) {
      if (!migratedSignatures.has(signature)) {
        problems.push(`index missing from migrations: ${table} ${signature}`);
      }
    }
  }
  for (const [table, migratedSignatures] of migrated.indexSignatures) {
    const modelSignatures = models.indexSignatures.get(table) || new Set();
    for (const signature of migratedSignatures) {
      if (!modelSignatures.has(signature)) {
        problems.push(`index not defined by any model: ${table} ${signature}`);
      }
    }
  }

  for (const duplicate of [...migrated.duplicateIndexes, ...models.duplicateIndexes]) {
    problems.push(
      `duplicate indexes on ${duplicate.table} ${duplicate.signature}: ${duplicate.names.join(', ')}`
    );
  }

  return problems;
}

async function main() {
  const base = getConnectionConfig().database;
  const migratedDb = `${base}_migrated_check`;
  const modelsDb = `${base}_models_check`;

  console.log('Schema drift check');
  console.log(`  server: ${adminParts().host}:${adminParts().port}`);

  await createDatabase(modelsDb);
  await createDatabase(migratedDb);

  try {
    buildModelsSchema(modelsDb);
    buildMigratedSchema(migratedDb);

    const [migrated, models] = await Promise.all([loadSchema(migratedDb), loadSchema(modelsDb)]);

    const problems = diffSchemas(migrated, models);

    if (problems.length > 0) {
      console.error(`\nSchema drift detected (${problems.length} difference(s)):\n`);
      for (const problem of problems.slice(0, 100)) {
        console.error(`  - ${problem}`);
      }
      if (problems.length > 100) {
        console.error(`  ...and ${problems.length - 100} more`);
      }
      console.error(
        '\nAdd a migration for the model changes, or regenerate the baseline with `yarn db:schema:dump`.'
      );
      process.exitCode = 1;
      return;
    }

    console.log('\nNo drift: migrations reproduce the model schema.');
  } finally {
    await dropDatabase(migratedDb);
    await dropDatabase(modelsDb);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
