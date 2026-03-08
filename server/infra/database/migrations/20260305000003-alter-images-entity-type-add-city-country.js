'use strict';

/**
 * Update images.entity_type ENUM to add 'city' and 'country'.
 *
 * Previous values (from the original model):
 *   'hotel', 'user_avatar', 'room', 'review'
 *
 * New values:
 *   'hotel', 'user_avatar', 'room', 'review', 'city', 'country'
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('images', 'entity_type', {
      type: Sequelize.ENUM('hotel', 'user_avatar', 'room', 'review', 'city', 'country'),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // NOTE: This will fail if there are any rows with entity_type IN ('city', 'country').
    // Only run the down migration if you have cleaned up such rows.
    await queryInterface.changeColumn('images', 'entity_type', {
      type: Sequelize.ENUM('hotel', 'user_avatar', 'room', 'review'),
      allowNull: false,
    });
  },
};

