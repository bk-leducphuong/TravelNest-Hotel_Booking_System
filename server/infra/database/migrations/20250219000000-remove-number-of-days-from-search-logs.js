'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('search_logs', 'number_of_days');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('search_logs', 'number_of_days', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
  },
};
