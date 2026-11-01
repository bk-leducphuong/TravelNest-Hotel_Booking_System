/**
 * Backfill the normalized hotel-name columns of `hotel_search_snapshots`.
 *
 * Normalization lives in JS (`utils/placeName.js`) because it must strip
 * accents and map đ/Đ -> d, which portable SQL cannot do. MySQL-only search and
 * hotel-name autocomplete depend on these columns, so any bulk rebuild that
 * writes rows directly (LOAD DATA / INSERT ... SELECT) must run this afterwards.
 */

const { normalizeText, compactKey } = require('../../utils/placeName');

const BATCH_SIZE = 1000;

/**
 * @param {import('mysql2/promise').Connection} conn writer connection
 * @param {{ table?: string, log?: Function, batchSize?: number }} [options]
 * @returns {Promise<{ updated: number, ms: number }>}
 */
async function backfillSearchNames(conn, options = {}) {
  const { table = 'hotel_search_snapshots', log = console.log, batchSize = BATCH_SIZE } = options;
  const startedAt = Date.now();
  let lastId = null;
  let updated = 0;

  for (;;) {
    const where = lastId ? 'WHERE hotel_id > ?' : '';
    const [rows] = await conn.query(
      `SELECT hotel_id, hotel_name FROM \`${table}\` ${where} ORDER BY hotel_id ASC LIMIT ?`,
      lastId ? [lastId, batchSize] : [batchSize]
    );

    if (rows.length === 0) break;

    const ids = rows.map((row) => row.hotel_id);
    const normalizedCase = rows.map(() => 'WHEN ? THEN ?').join(' ');
    const compactCase = rows.map(() => 'WHEN ? THEN ?').join(' ');

    const normalizedParams = rows.flatMap((row) => [row.hotel_id, normalizeText(row.hotel_name)]);
    const compactParams = rows.flatMap((row) => [row.hotel_id, compactKey(row.hotel_name)]);

    const placeholders = ids.map(() => '?').join(', ');

    await conn.query(
      `UPDATE \`${table}\`
          SET hotel_name_normalized = CASE hotel_id ${normalizedCase} END,
              hotel_name_compact = CASE hotel_id ${compactCase} END
        WHERE hotel_id IN (${placeholders})`,
      [...normalizedParams, ...compactParams, ...ids]
    );

    updated += rows.length;
    lastId = rows[rows.length - 1].hotel_id;
  }

  const ms = Date.now() - startedAt;
  log(`  search names: ${updated} snapshot row(s) normalized in ${ms}ms`);

  return { updated, ms };
}

module.exports = { backfillSearchNames };
