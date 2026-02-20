'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop search_logs table - data migrated to ClickHouse
    await queryInterface.dropTable('search_logs');
  },

  async down(queryInterface, Sequelize) {
    // Recreate search_logs table if rollback is needed
    await queryInterface.createTable('search_logs', {
      search_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      search_time: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      adults: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      children: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rooms: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      check_in_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      check_out_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('search_logs', ['search_id'], {
      unique: true,
      name: 'PRIMARY',
    });
  },
};
