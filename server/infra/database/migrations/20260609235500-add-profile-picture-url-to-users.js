'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('users');
    if (!table.profile_picture_url) {
      await queryInterface.addColumn('users', 'profile_picture_url', {
        type: Sequelize.TEXT,
        allowNull: true,
        after: 'country',
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('users');
    if (table.profile_picture_url) {
      await queryInterface.removeColumn('users', 'profile_picture_url');
    }
  },
};
