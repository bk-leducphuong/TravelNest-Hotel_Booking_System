/**
 * Set-based rebuild of `hotel_search_snapshots`.
 *
 * Replaces the legacy per-hotel `fullRefresh()` loop (several queries per hotel)
 * with a single `INSERT ... SELECT ... ON DUPLICATE KEY UPDATE`. Secondary
 * indexes are dropped for the duration of the rebuild and added back afterwards.
 */

const { dropSecondaryIndexes, recreateIndexes } = require('./bulk');

const TABLE = 'hotel_search_snapshots';

const REBUILD_SQL = `
INSERT INTO \`hotel_search_snapshots\` (
  \`hotel_id\`, \`hotel_name\`, \`city_id\`, \`city\`, \`country_id\`, \`country\`,
  \`latitude\`, \`longitude\`, \`min_price\`, \`max_price\`, \`avg_rating\`, \`review_count\`,
  \`hotel_class\`, \`status\`, \`amenity_codes\`, \`has_free_cancellation\`,
  \`is_available\`, \`has_available_rooms\`, \`primary_image_url\`,
  \`total_bookings\`, \`view_count\`, \`created_at\`, \`updated_at\`
)
SELECT
  h.\`id\`, h.\`name\`, h.\`city_id\`, c.\`name\`, h.\`country_id\`, co.\`name\`,
  h.\`latitude\`, h.\`longitude\`, pr.min_price, pr.max_price,
  COALESCE(hrs.\`overall_rating\`, 0), COALESCE(hrs.\`total_reviews\`, 0),
  h.\`hotel_class\`, h.\`status\`, am.amenity_codes, 0,
  (pr.min_price IS NOT NULL AND h.\`status\` = 'active'),
  (pr.min_price IS NOT NULL),
  img.object_key,
  0, 0, NOW(), NOW()
FROM \`hotels\` h
LEFT JOIN \`cities\` c ON c.\`id\` = h.\`city_id\`
LEFT JOIN \`countries\` co ON co.\`id\` = h.\`country_id\`
LEFT JOIN (
  SELECT r.\`hotel_id\` AS hotel_id,
         MIN(ri.\`price_per_night\`) AS min_price,
         MAX(ri.\`price_per_night\`) AS max_price
  FROM \`room_inventory\` ri
  JOIN \`rooms\` r ON r.\`id\` = ri.\`room_id\`
  WHERE ri.\`date\` >= CURDATE() AND ri.\`status\` = 'open' AND ri.\`booked_rooms\` < ri.\`total_rooms\`
  GROUP BY r.\`hotel_id\`
) pr ON pr.hotel_id = h.\`id\`
LEFT JOIN \`hotel_rating_summaries\` hrs ON hrs.\`hotel_id\` = h.\`id\`
LEFT JOIN (
  SELECT ha.\`hotel_id\` AS hotel_id, JSON_ARRAYAGG(a.\`code\`) AS amenity_codes
  FROM \`hotel_amenities\` ha
  JOIN \`amenities\` a ON a.\`id\` = ha.\`amenity_id\`
  WHERE ha.\`is_available\` = 1
  GROUP BY ha.\`hotel_id\`
) am ON am.hotel_id = h.\`id\`
LEFT JOIN (
  SELECT i.\`entity_id\` AS entity_id, MIN(i.\`object_key\`) AS object_key
  FROM \`images\` i
  WHERE i.\`entity_type\` = 'hotel' AND i.\`is_primary\` = 1 AND i.\`status\` = 'active'
  GROUP BY i.\`entity_id\`
) img ON img.entity_id = h.\`id\`
ON DUPLICATE KEY UPDATE
  \`hotel_name\` = VALUES(\`hotel_name\`),
  \`city_id\` = VALUES(\`city_id\`),
  \`city\` = VALUES(\`city\`),
  \`country_id\` = VALUES(\`country_id\`),
  \`country\` = VALUES(\`country\`),
  \`latitude\` = VALUES(\`latitude\`),
  \`longitude\` = VALUES(\`longitude\`),
  \`min_price\` = VALUES(\`min_price\`),
  \`max_price\` = VALUES(\`max_price\`),
  \`avg_rating\` = VALUES(\`avg_rating\`),
  \`review_count\` = VALUES(\`review_count\`),
  \`hotel_class\` = VALUES(\`hotel_class\`),
  \`status\` = VALUES(\`status\`),
  \`amenity_codes\` = VALUES(\`amenity_codes\`),
  \`has_free_cancellation\` = VALUES(\`has_free_cancellation\`),
  \`is_available\` = VALUES(\`is_available\`),
  \`has_available_rooms\` = VALUES(\`has_available_rooms\`),
  \`primary_image_url\` = VALUES(\`primary_image_url\`),
  \`total_bookings\` = VALUES(\`total_bookings\`),
  \`view_count\` = VALUES(\`view_count\`),
  \`updated_at\` = VALUES(\`updated_at\`)
`;

/**
 * Rebuild every snapshot row in one statement.
 * @param {*} conn writer connection
 * @param {{ clear?: boolean, manageIndexes?: boolean, log?: Function }} [options]
 */
async function rebuildHotelSearchSnapshots(
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
  rebuildHotelSearchSnapshots,
};
