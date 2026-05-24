'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('bookings', ['status', 'expires_at'], {
      name: 'idx_bookings_status_expires_at',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('bookings', 'idx_bookings_status_expires_at');
  },
};
