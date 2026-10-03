/**
 * Set-based rebuild of `hotel_rating_summaries`.
 *
 * The review module maintains this projection through `recomputeHotelRatingSummary`,
 * which is driven by NATS events on review create/update. Bulk-loading reviews
 * with `LOAD DATA` bypasses those events, so the table would otherwise stay empty
 * — and it is the *only* rating source in the project: `hotels` has no rating
 * columns, and `hotel_search_snapshots.avg_rating` is populated from here via
 * LEFT JOIN in `snapshots.js`. Empty means every hotel renders a score of `0`.
 *
 * The SQL mirrors `modules/review/domain/rating-summary.js` exactly:
 *   - only `status = 'published'` reviews count
 *   - `bucket = ROUND(rating_overall)` clamped to 1..10
 *   - `overall_rating = ROUND(SUM / COUNT, 2)`
 *   - `last_review_date = MAX(created_at)`
 *
 * One statement, no per-hotel round trip.
 */

const { dropSecondaryIndexes, recreateIndexes } = require('./bulk');

const TABLE = 'hotel_rating_summaries';

const REBUILD_SQL = `
INSERT INTO \`hotel_rating_summaries\` (
  \`hotel_id\`, \`overall_rating\`, \`total_reviews\`,
  \`rating_10\`, \`rating_9\`, \`rating_8\`, \`rating_7\`, \`rating_6\`,
  \`rating_5\`, \`rating_4\`, \`rating_3\`, \`rating_2\`, \`rating_1\`,
  \`total_rating_sum\`, \`last_review_date\`, \`created_at\`, \`updated_at\`
)
SELECT
  r.\`hotel_id\`,
  LEAST(ROUND(SUM(r.\`rating_overall\`) / COUNT(*), 2), 9.99),
  COUNT(*),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 10),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 9),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 8),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 7),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 6),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 5),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 4),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 3),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 2),
  SUM(LEAST(GREATEST(ROUND(r.\`rating_overall\`), 1), 10) = 1),
  ROUND(SUM(r.\`rating_overall\`), 2),
  MAX(r.\`created_at\`),
  NOW(), NOW()
FROM \`reviews\` r
WHERE r.\`status\` = 'published' AND r.\`rating_overall\` IS NOT NULL
GROUP BY r.\`hotel_id\`
ON DUPLICATE KEY UPDATE
  \`overall_rating\` = VALUES(\`overall_rating\`),
  \`total_reviews\` = VALUES(\`total_reviews\`),
  \`rating_10\` = VALUES(\`rating_10\`),
  \`rating_9\` = VALUES(\`rating_9\`),
  \`rating_8\` = VALUES(\`rating_8\`),
  \`rating_7\` = VALUES(\`rating_7\`),
  \`rating_6\` = VALUES(\`rating_6\`),
  \`rating_5\` = VALUES(\`rating_5\`),
  \`rating_4\` = VALUES(\`rating_4\`),
  \`rating_3\` = VALUES(\`rating_3\`),
  \`rating_2\` = VALUES(\`rating_2\`),
  \`rating_1\` = VALUES(\`rating_1\`),
  \`total_rating_sum\` = VALUES(\`total_rating_sum\`),
  \`last_review_date\` = VALUES(\`last_review_date\`),
  \`updated_at\` = VALUES(\`updated_at\`)
`;

/**
 * Rebuild every rating summary row in one statement.
 * @param {*} conn writer connection
 * @param {{ clear?: boolean, manageIndexes?: boolean, log?: Function }} [options]
 */
async function rebuildHotelRatingSummaries(
  conn,
  { clear = true, manageIndexes = true, log = console.log } = {}
) {
  const startedAt = Date.now();

  if (clear) {
    await conn.query(`TRUNCATE TABLE \`${TABLE}\``);
  }

  let dropped = [];
  try {
    if (manageIndexes) {
      dropped = await dropSecondaryIndexes(conn, TABLE, { log });
    }

    const [result] = await conn.query(REBUILD_SQL);
    return {
      table: TABLE,
      affectedRows: Number(result.affectedRows ?? 0),
      ms: Date.now() - startedAt,
    };
  } finally {
    if (manageIndexes && dropped.length > 0) {
      await recreateIndexes(conn, TABLE, dropped, { log });
    }
  }
}

module.exports = {
  REBUILD_SQL,
  TABLE,
  rebuildHotelRatingSummaries,
};
