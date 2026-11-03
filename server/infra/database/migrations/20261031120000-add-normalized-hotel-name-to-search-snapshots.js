'use strict';

const { normalizeText, compactKey } = require('../../../utils/placeName');

const {
  addColumnIfMissing,
  addIndexIfMissing,
  columnExists,
  dropIndexIfExists,
} = require('../migration-utils/schema');

const TABLE = 'hotel_search_snapshots';
const BATCH_SIZE = 500;

const INDEXES = [
  {
    name: 'idx_hss_name_compact',
    fields: ['hotel_name_compact'],
    options: {
      name: 'idx_hss_name_compact',
      comment: 'Diacritic/space-insensitive hotel-name lookup (autocomplete + name search)',
    },
  },
  {
    name: 'idx_hss_name_normalized',
    fields: ['hotel_name_normalized'],
    options: {
      name: 'idx_hss_name_normalized',
      comment: 'Normalized hotel-name prefix lookup',
    },
  },
  {
    name: 'idx_hss_city_status',
    fields: ['city_id', 'status', 'hotel_id'],
    options: {
      name: 'idx_hss_city_status',
      comment: 'Candidate hotels for a resolved city',
    },
  },
  {
    name: 'idx_hss_country_status',
    fields: ['country_id', 'status', 'hotel_id'],
    options: {
      name: 'idx_hss_country_status',
      comment: 'Candidate hotels for a resolved country',
    },
  },
];

/**
 * Backfill the normalized/compact hotel-name columns in batches. Normalization
 * runs in JS so it matches utils/placeName.js exactly (including đ/Đ -> d),
 * which is not expressible with portable SQL.
 */
async function backfillHotelNames(queryInterface) {
  const sequelize = queryInterface.sequelize;
  let lastId = null;

  while (true) {
    const where = lastId ? `WHERE hotel_id > ${sequelize.escape(lastId)}` : '';
    const [rows] = await sequelize.query(
      `SELECT hotel_id, hotel_name FROM ${TABLE} ${where} ORDER BY hotel_id ASC LIMIT ${BATCH_SIZE}`
    );

    if (!rows.length) break;

    // Two CASE expressions derived from the same row list, so both columns are
    // updated in one statement that still uses the primary key.
    const normalizedCase = rows
      .map(
        (row) =>
          `WHEN ${sequelize.escape(row.hotel_id)} THEN ${sequelize.escape(normalizeText(row.hotel_name))}`
      )
      .join(' ');
    const compactCase = rows
      .map(
        (row) =>
          `WHEN ${sequelize.escape(row.hotel_id)} THEN ${sequelize.escape(compactKey(row.hotel_name))}`
      )
      .join(' ');
    const ids = rows.map((row) => sequelize.escape(row.hotel_id)).join(', ');

    await sequelize.query(
      `UPDATE ${TABLE}
         SET hotel_name_normalized = CASE hotel_id ${normalizedCase} END,
             hotel_name_compact = CASE hotel_id ${compactCase} END
       WHERE hotel_id IN (${ids})`
    );

    lastId = rows[rows.length - 1].hotel_id;
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await addColumnIfMissing(queryInterface, TABLE, 'hotel_name_normalized', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'hotel_name',
      comment: 'Lowercased, accent-stripped hotel name for matching',
    });

    await addColumnIfMissing(queryInterface, TABLE, 'hotel_name_compact', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'hotel_name_normalized',
      comment: 'Space/punctuation-insensitive hotel-name key',
    });

    await backfillHotelNames(queryInterface);

    for (const index of INDEXES) {
      await addIndexIfMissing(queryInterface, TABLE, index.fields, index.options);
    }
  },

  down: async (queryInterface) => {
    for (const index of INDEXES) {
      await dropIndexIfExists(queryInterface, TABLE, index.name);
    }

    if (await columnExists(queryInterface, TABLE, 'hotel_name_compact')) {
      await queryInterface.removeColumn(TABLE, 'hotel_name_compact');
    }

    if (await columnExists(queryInterface, TABLE, 'hotel_name_normalized')) {
      await queryInterface.removeColumn(TABLE, 'hotel_name_normalized');
    }
  },
};
