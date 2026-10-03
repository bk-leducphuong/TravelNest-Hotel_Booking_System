/**
 * Low-level MySQL helpers for the fast seed pipeline.
 *
 * Responsibilities:
 *   - open raw `mysql2` connections with LOCAL INFILE enabled;
 *   - apply the aggressive (dev-only) bulk-load session settings;
 *   - stream an iterable of rows into `LOAD DATA LOCAL INFILE` with no temp file;
 *   - drop secondary indexes before a load and rebuild them afterwards.
 */

const fs = require('fs');

const mysql = require('mysql2/promise');

const { rowsToCsvStream } = require('./csv');
const { getDbConfig } = require('./env');

// Dev-only accelerators. `sql_log_bin` needs DB_ADMIN_USER (root).
const BULK_SESSION_STATEMENTS = [
  'SET SESSION unique_checks = 0',
  'SET SESSION foreign_key_checks = 0',
  'SET SESSION sql_log_bin = 0',
  "SET SESSION sql_mode = ''",
  'SET SESSION autocommit = 1',
];

/**
 * Open a raw mysql2 connection. `localInfile` must also be enabled server-side
 * (`--local-infile=1`).
 * @param {{ admin?: boolean }} [options]
 */
async function createConnection({ admin = true } = {}) {
  const config = getDbConfig({ admin });
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    // Match Sequelize's default timezone and the UTC formatting used by csv.js.
    timezone: 'Z',
    multipleStatements: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

/**
 * Apply the bulk-load session settings. Individual statements that fail (for
 * example `sql_log_bin` without the privilege) are warned about, not fatal.
 */
async function applyBulkSession(conn, { log = console.log } = {}) {
  for (const sql of BULK_SESSION_STATEMENTS) {
    try {
      await conn.query(sql);
    } catch (error) {
      log(`   ⚠️  Could not apply "${sql}": ${error.message}`);
    }
  }
}

async function isLocalInfileEnabled(conn) {
  const [rows] = await conn.query("SHOW VARIABLES LIKE 'local_infile'");
  return rows.length > 0 && String(rows[0].Value).toUpperCase() === 'ON';
}

/**
 * Truncate the given tables. FK checks are expected to already be disabled by
 * `applyBulkSession`.
 */
async function truncateTables(conn, tables) {
  for (const table of tables) {
    await conn.query(`TRUNCATE TABLE \`${table}\``);
  }
}

/**
 * Stream rows from a query using the core (non-promise) connection, which is
 * the only one exposing `.stream()`.
 * @returns {AsyncGenerator<Object>}
 */
async function* streamQuery(conn, sql, params = []) {
  const core = conn.connection ?? conn;
  const stream = core.query(sql, params).stream();
  for await (const row of stream) {
    yield row;
  }
}

/**
 * Stream a single column from a query.
 * @returns {AsyncGenerator<*>}
 */
async function* streamColumn(conn, sql, column, params = []) {
  for await (const row of streamQuery(conn, sql, params)) {
    yield row[column];
  }
}

/**
 * Read the secondary (non-PRIMARY) indexes for a table, grouped column-wise.
 */
async function getSecondaryIndexes(conn, table) {
  const [rows] = await conn.query(
    `SELECT INDEX_NAME AS name, NON_UNIQUE AS nonUnique, INDEX_TYPE AS type,
            SEQ_IN_INDEX AS seq, COLUMN_NAME AS columnName, SUB_PART AS subPart
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    [table]
  );

  const byName = new Map();
  for (const row of rows) {
    if (row.name === 'PRIMARY') {
      continue;
    }
    if (!byName.has(row.name)) {
      byName.set(row.name, {
        name: row.name,
        unique: Number(row.nonUnique) === 0,
        type: row.type,
        columns: [],
      });
    }
    byName.get(row.name).columns.push({
      name: row.columnName,
      subPart: row.subPart === null || row.subPart === undefined ? null : Number(row.subPart),
    });
  }

  return Array.from(byName.values());
}

/**
 * Columns that participate in a foreign key on this table. InnoDB requires a
 * supporting index for each FK column, so those indexes must not be dropped.
 * @returns {Promise<Set<string>>}
 */
async function getForeignKeyColumns(conn, table) {
  const [rows] = await conn.query(
    `SELECT \`COLUMN_NAME\` AS columnName
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [table]
  );

  return new Set(rows.map((row) => row.columnName));
}

function buildAddIndexClause(index) {
  const columns = index.columns
    .map((column) =>
      column.subPart ? `\`${column.name}\`(${column.subPart})` : `\`${column.name}\``
    )
    .join(', ');
  const unique = index.unique ? 'UNIQUE ' : '';
  const using = index.type && index.type !== 'BTREE' ? ` USING ${index.type}` : '';

  return `ADD ${unique}INDEX \`${index.name}\` (${columns})${using}`;
}

/**
 * Drop every droppable non-PRIMARY index on a table in a single ALTER.
 * Indexes that back a foreign key are kept (InnoDB refuses to drop them).
 * @returns {Promise<Array>} the dropped index definitions, for rebuilding.
 */
async function dropSecondaryIndexes(conn, table, { log = console.log } = {}) {
  const indexes = await getSecondaryIndexes(conn, table);
  const fkColumns = await getForeignKeyColumns(conn, table);
  const droppable = indexes.filter(
    (index) => index.columns.length > 0 && !fkColumns.has(index.columns[0].name)
  );

  if (droppable.length === 0) {
    return [];
  }

  const clauses = droppable.map((index) => `DROP INDEX \`${index.name}\``).join(', ');
  await conn.query(`ALTER TABLE \`${table}\` ${clauses}`);
  const skipped = indexes.length - droppable.length;
  log(
    `   ⏬ Dropped ${droppable.length} secondary index(es) on ${table}` +
      (skipped > 0 ? ` (${skipped} FK-backed kept)` : '')
  );

  return droppable;
}

/**
 * Rebuild previously dropped indexes and refresh table statistics.
 */
async function recreateIndexes(conn, table, indexes, { log = console.log } = {}) {
  if (!indexes || indexes.length === 0) {
    return;
  }

  const clauses = indexes.map(buildAddIndexClause).join(', ');
  await conn.query(`ALTER TABLE \`${table}\` ${clauses}`);
  await conn.query(`ANALYZE TABLE \`${table}\``);
  log(`   ⏫ Rebuilt ${indexes.length} index(es) on ${table}`);
}

function buildLoadDataSql(table, columns) {
  const columnList = columns.map((column) => `\`${column}\``).join(',');

  return (
    `LOAD DATA LOCAL INFILE 'stream' INTO TABLE \`${table}\` ` +
    `CHARACTER SET utf8mb4 ` +
    `FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\\\' ` +
    `LINES TERMINATED BY '\\n' ` +
    `(${columnList})`
  );
}

/**
 * Stream a Readable of CSV rows into the table.
 * @returns {Promise<{ affectedRows: number }>}
 */
async function loadStream(conn, table, columns, stream) {
  const sql = buildLoadDataSql(table, columns);
  const [result] = await conn.query({ sql, infileStreamFactory: () => stream });
  return result;
}

function normalizeInsertValue(value) {
  if (value === undefined) {
    return null;
  }
  if (value === true) {
    return 1;
  }
  if (value === false) {
    return 0;
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Fallback loader for when `local_infile` is disabled on the server: batched
 * multi-row INSERTs through mysql2 (still far faster than row-by-row inserts).
 */
async function insertRows(conn, table, columns, rows, { batchSize = 5000 } = {}) {
  const columnList = columns.map((column) => `\`${column}\``).join(', ');
  const placeholder = `(${columns.map(() => '?').join(', ')})`;
  let batch = [];
  let inserted = 0;

  async function flush() {
    if (batch.length === 0) {
      return;
    }

    const values = [];
    for (const row of batch) {
      for (const column of columns) {
        values.push(normalizeInsertValue(row[column]));
      }
    }

    await conn.query(
      `INSERT INTO \`${table}\` (${columnList}) VALUES ${batch.map(() => placeholder).join(', ')}`,
      values
    );

    inserted += batch.length;
    batch = [];
  }

  for await (const row of rows) {
    batch.push(row);
    if (batch.length >= batchSize) {
      await flush();
    }
  }
  await flush();

  return { table, affectedRows: inserted, ms: 0 };
}

/**
 * Load one table: optionally drop secondary indexes, write the rows, then
 * rebuild the indexes. Uses `LOAD DATA LOCAL INFILE` when the server allows it,
 * otherwise falls back to batched INSERTs. Indexes are rebuilt even on failure.
 * @param {Object} options
 * @param {*[]} options.rows - iterable of row objects (sync or async)
 * @param {boolean} [options.useLoadData] - override auto-detection
 */
async function loadTable(
  conn,
  { table, columns, rows, manageIndexes = true, useLoadData, log = console.log }
) {
  const startedAt = Date.now();
  const loadData = useLoadData ?? (await isLocalInfileEnabled(conn));
  let dropped = [];
  let affectedRows = 0;

  try {
    if (manageIndexes) {
      dropped = await dropSecondaryIndexes(conn, table, { log });
    }

    if (loadData) {
      const result = await loadStream(conn, table, columns, rowsToCsvStream(rows, columns));
      affectedRows = Number(result.affectedRows ?? result.affected_rows ?? 0);
    } else {
      const result = await insertRows(conn, table, columns, rows);
      affectedRows = result.affectedRows;
    }

    return {
      table,
      affectedRows,
      ms: Date.now() - startedAt,
      mode: loadData ? 'load-data' : 'insert',
    };
  } finally {
    if (manageIndexes && dropped.length > 0) {
      await recreateIndexes(conn, table, dropped, { log });
    }
  }
}

/**
 * Load several CSV shard files into one table. Indexes are dropped once before
 * the first shard and rebuilt after the last.
 * @param {Object} options
 * @param {*[]} options.files - absolute paths to shard files (loaded in order)
 */
async function loadFiles(conn, { table, columns, files, manageIndexes = true, log = console.log }) {
  const startedAt = Date.now();
  let dropped = [];
  let affectedRows = 0;

  try {
    if (manageIndexes) {
      dropped = await dropSecondaryIndexes(conn, table, { log });
    }

    for (const file of files) {
      const result = await loadStream(conn, table, columns, fs.createReadStream(file));
      affectedRows += Number(result.affectedRows ?? result.affected_rows ?? 0);
    }

    return { table, affectedRows, ms: Date.now() - startedAt };
  } finally {
    if (manageIndexes && dropped.length > 0) {
      await recreateIndexes(conn, table, dropped, { log });
    }
  }
}

/**
 * Approximate row count from information_schema (avoids COUNT(*) on millions).
 */
async function approximateRowCount(conn, table) {
  const [rows] = await conn.query(
    `SELECT TABLE_ROWS AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows.length > 0 ? Number(rows[0].n) : 0;
}

module.exports = {
  BULK_SESSION_STATEMENTS,
  applyBulkSession,
  approximateRowCount,
  buildLoadDataSql,
  createConnection,
  dropSecondaryIndexes,
  getSecondaryIndexes,
  insertRows,
  isLocalInfileEnabled,
  loadFiles,
  loadStream,
  loadTable,
  recreateIndexes,
  streamColumn,
  streamQuery,
  truncateTables,
};
