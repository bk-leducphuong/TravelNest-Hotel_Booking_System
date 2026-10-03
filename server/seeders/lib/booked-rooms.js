/**
 * Set-based backfill of `room_inventory.booked_rooms` from seeded bookings.
 *
 * `booked_rooms` is owned by the app: `createPaymentIntent` calls
 * `inventoryModule.reserveRooms` to increment it across the stay, and
 * `handleRefundSucceeded` calls `releaseRooms` to decrement. Bulk-loading
 * bookings skips both, leaving every one of the ~600k inventory rows at 0 —
 * which makes availability (`total_rooms - booked_rooms - held_rooms`) always
 * "everything is free" and defeats the `booked_rooms < total_rooms` filter in
 * `hotel_search_snapshot.repository.js`.
 *
 * A recursive CTE expands each qualifying booking into one row per night, then
 * a single UPDATE aggregates per (room, date) and clamps to `total_rooms` so the
 * invariant `booked_rooms <= total_rooms` always holds.
 */

const TABLE = 'room_inventory';

/**
 * Statuses that still hold inventory. Mirrors the release points above:
 * cancelled bookings had their rooms released, expired/pending never reserved.
 */
const HELD_STATUSES = ['confirmed', 'completed', 'checked_in', 'no_show'];

/**
 * CTE that expands bookings into one row per occupied night and sums quantity.
 */
const BOOKED_ROOMS_CTE = `
WITH RECURSIVE \`stay\` AS (
  SELECT
    b.\`id\` AS \`booking_id\`,
    b.\`room_id\` AS \`room_id\`,
    b.\`check_in_date\` AS \`date\`,
    b.\`check_out_date\` AS \`check_out_date\`,
    b.\`quantity\` AS \`quantity\`
  FROM \`bookings\` b
  WHERE b.\`status\` IN (?)
  UNION ALL
  SELECT
    s.\`booking_id\`, s.\`room_id\`,
    DATE_ADD(s.\`date\`, INTERVAL 1 DAY),
    s.\`check_out_date\`, s.\`quantity\`
  FROM \`stay\` s
  WHERE s.\`date\` < DATE_SUB(s.\`check_out_date\`, INTERVAL 1 DAY)
),
\`occupied\` AS (
  SELECT \`room_id\`, \`date\`, SUM(\`quantity\`) AS \`booked\`
  FROM \`stay\`
  GROUP BY \`room_id\`, \`date\`
)
`;

const UPDATE_SQL = `
UPDATE \`room_inventory\` ri
JOIN \`occupied\` o
  ON o.\`room_id\` = ri.\`room_id\` AND o.\`date\` = ri.\`date\`
SET
  ri.\`booked_rooms\` = LEAST(o.\`booked\`, ri.\`total_rooms\`),
  ri.\`updated_at\` = NOW()
`;

/** Zero out previously-derived values so re-runs are idempotent. */
const RESET_SQL = 'UPDATE `room_inventory` SET `booked_rooms` = 0 WHERE `booked_rooms` <> 0';

/**
 * Recompute `booked_rooms` from the bookings table.
 *
 * @param {*} conn writer connection
 * @param {{ manageIndexes?: boolean, reset?: boolean, log?: Function }} [options]
 */
async function backfillBookedRooms(conn, { reset = true, log = console.log } = {}) {
  const startedAt = Date.now();

  // The recursive CTE walks one row per night; 14 nights max per booking, but
  // MySQL's default cte_max_recursion_depth (1000) is per-query row count, so
  // raise it for this statement only.
  const depthRows = await conn.query('SELECT @@cte_max_recursion_depth AS depth');
  const previousDepth = Number(depthRows?.[0]?.[0]?.depth ?? 1000);
  const requiredDepth = 1_000_000;

  try {
    if (previousDepth < requiredDepth) {
      await conn.query(`SET SESSION cte_max_recursion_depth = ${requiredDepth}`);
    }

    if (reset) {
      const [resetResult] = await conn.query(RESET_SQL);
      log(`   🧹 Reset ${Number(resetResult.affectedRows ?? 0)} inventory row(s) before backfill`);
    }

    const [result] = await conn.query(BOOKED_ROOMS_CTE + UPDATE_SQL, [HELD_STATUSES]);
    return {
      table: TABLE,
      affectedRows: Number(result.affectedRows ?? 0),
      ms: Date.now() - startedAt,
    };
  } finally {
    if (previousDepth < requiredDepth) {
      await conn.query(`SET SESSION cte_max_recursion_depth = ${previousDepth}`);
    }
  }
}

module.exports = {
  BOOKED_ROOMS_CTE,
  HELD_STATUSES,
  RESET_SQL,
  TABLE,
  UPDATE_SQL,
  backfillBookedRooms,
};
