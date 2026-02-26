'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'password_hash');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};

