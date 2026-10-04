/**
 * Streaming CSV serializer for MySQL `LOAD DATA LOCAL INFILE`.
 *
 * The statement emitted by `bulk.js` uses:
 *
 *   FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\'
 *   LINES TERMINATED BY '\n'
 *
 * so fields must be escaped MySQL-style, not RFC-4180:
 *   - NULL is written as the unquoted `\N` sentinel.
 *   - Backslashes are always escaped.
 *   - Fields containing the delimiter, the enclosure or a newline are wrapped
 *     in double quotes and their `"` is escaped as `\"`.
 *
 * Rows are produced lazily and buffered into reasonably sized string chunks so
 * that millions of rows never have to be materialised in memory.
 */

const { Readable } = require('stream');

const NULL_SENTINEL = '\\N';
const DEFAULT_BATCH_ROWS = 2000;

function pad2(value) {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * Serialize a Date as `YYYY-MM-DD HH:mm:ss` in UTC (Sequelize's default).
 * Invalid dates become NULL.
 */
function formatDate(value) {
  if (Number.isNaN(value.getTime())) {
    return NULL_SENTINEL;
  }

  return (
    `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())} ` +
    `${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}:${pad2(value.getUTCSeconds())}`
  );
}

/**
 * Escape a string for a MySQL TSV/CSV field.
 */
function escapeString(value) {
  if (value.length === 0) {
    // Force an explicit empty string instead of an unquoted empty field, which
    // MySQL would coerce to NULL/0 depending on the column type.
    return '""';
  }

  let out = value.replace(/\\/g, '\\\\');

  if (/[",\n\r]/.test(value)) {
    out = `"${out.replace(/"/g, '\\"')}"`;
  }

  return out;
}

function serializeValue(value) {
  if (value === null || value === undefined) {
    return NULL_SENTINEL;
  }
  if (value === true) {
    return '1';
  }
  if (value === false) {
    return '0';
  }
  if (value instanceof Date) {
    return formatDate(value);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : NULL_SENTINEL;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'object') {
    return escapeString(JSON.stringify(value));
  }
  return escapeString(String(value));
}

/**
 * Serialize one row (object keyed by column name) into a CSV line.
 * @param {Object} row
 * @param {string[]} columns
 */
function serializeRow(row, columns) {
  let out = '';
  for (let i = 0; i < columns.length; i++) {
    if (i > 0) {
      out += ',';
    }
    out += serializeValue(row[columns[i]]);
  }
  return `${out}\n`;
}

/**
 * Wrap an iterable of row objects (sync or async) in a Readable CSV stream.
 * @param {Iterable<Object>|AsyncIterable<Object>} rows
 * @param {string[]} columns
 * @param {{ batchRows?: number }} [options]
 * @returns {Readable}
 */
function rowsToCsvStream(rows, columns, { batchRows = DEFAULT_BATCH_ROWS } = {}) {
  async function* generate() {
    let buffer = [];

    for await (const row of rows) {
      buffer.push(serializeRow(row, columns));
      if (buffer.length >= batchRows) {
        yield buffer.join('');
        buffer = [];
      }
    }

    if (buffer.length > 0) {
      yield buffer.join('');
    }
  }

  return Readable.from(generate(), { objectMode: false });
}

module.exports = {
  NULL_SENTINEL,
  escapeString,
  formatDate,
  rowsToCsvStream,
  serializeRow,
  serializeValue,
};
