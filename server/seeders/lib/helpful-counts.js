/**
 * Resync `reviews.helpful_count` from `review_helpful_votes`.
 *
 * `helpful_count` is a denormalised cache the reviews generator fills with a
 * random number, so once real votes exist the two disagree and the sort order
 * on the reviews page is meaningless. This recomputes it in one statement.
 *
 * Only `is_helpful = 1` votes count, matching how the app increments the column.
 */

const TABLE = 'reviews';

const SYNC_SQL = `
UPDATE \`reviews\` r
LEFT JOIN (
  SELECT \`review_id\`, COUNT(*) AS \`helpful\`
  FROM \`review_helpful_votes\`
  WHERE \`is_helpful\` = 1
  GROUP BY \`review_id\`
) v ON v.\`review_id\` = r.\`id\`
SET r.\`helpful_count\` = COALESCE(v.\`helpful\`, 0), r.\`updated_at\` = r.\`updated_at\`
WHERE r.\`helpful_count\` <> COALESCE(v.\`helpful\`, 0)
`;

/**
 * @param {*} conn writer connection
 * @returns {Promise<{ table: string, affectedRows: number, ms: number }>}
 */
async function syncHelpfulCounts(conn) {
  const startedAt = Date.now();
  const [result] = await conn.query(SYNC_SQL);

  return {
    table: TABLE,
    affectedRows: Number(result.affectedRows ?? 0),
    ms: Date.now() - startedAt,
  };
}

module.exports = {
  SYNC_SQL,
  TABLE,
  syncHelpfulCounts,
};
