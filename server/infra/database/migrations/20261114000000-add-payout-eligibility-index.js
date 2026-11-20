'use strict';

const { addIndexIfMissing, dropIndexIfExists } = require('../migration-utils/schema');

const INDEX_NAME = 'idx_bookings_payout_eligibility';

/**
 * Payout generation scans `bookings` by hotel + status + checkout date. Add a
 * covering index so the daily job stays cheap as the bookings table grows.
 */
module.exports = {
  up: async (queryInterface) => {
    await addIndexIfMissing(queryInterface, 'bookings', ['hotel_id', 'status', 'check_out_date'], {
      name: INDEX_NAME,
      using: 'BTREE',
    });
  },

  down: async (queryInterface) => {
    await dropIndexIfExists(queryInterface, 'bookings', INDEX_NAME);
  },
};
