'use strict';

const { addIndexIfMissing } = require('../migration-utils/schema');

module.exports = {
  up: async (queryInterface) => {
    await addIndexIfMissing(queryInterface, 'bookings', ['status', 'expires_at'], {
      name: 'idx_bookings_status_expires_at',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('bookings', 'idx_bookings_status_expires_at');
  },
};
