'use strict';

const { addIndexIfMissing, createTableIfMissing } = require('../migration-utils/schema');

/**
 * Analytics event tables, previously stored in MongoDB.
 *
 * They are owned by the Go `analytics` service (see wiki/Table-Ownership.md).
 * The service only performs DML; the schema lives here with every other table.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await createTableIfMissing(queryInterface, 'analytics_search_logs', {
      search_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
      },
      destination_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
      },
      destination_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: '',
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      },
      radius: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      search_time: {
        type: Sequelize.DATE(3),
        allowNull: false,
      },
      adults: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      children: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      nights: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
      },
    });

    await addIndexIfMissing(
      queryInterface,
      'analytics_search_logs',
      ['user_id', 'is_deleted', 'search_time'],
      { name: 'idx_analytics_search_user_time' }
    );
    await addIndexIfMissing(
      queryInterface,
      'analytics_search_logs',
      ['destination_id', 'destination_type', 'is_deleted', 'search_time'],
      { name: 'idx_analytics_search_destination_time' }
    );
    await addIndexIfMissing(
      queryInterface,
      'analytics_search_logs',
      ['check_in_date', 'destination_id', 'destination_type', 'is_deleted'],
      { name: 'idx_analytics_search_checkin' }
    );
    await addIndexIfMissing(queryInterface, 'analytics_search_logs', ['search_time'], {
      name: 'idx_analytics_search_time',
    });

    await createTableIfMissing(queryInterface, 'analytics_hotel_view_events', {
      event_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
      },
      hotel_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: '',
      },
      viewed_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: false,
        defaultValue: '',
      },
      user_agent: {
        type: Sequelize.STRING(512),
        allowNull: false,
        defaultValue: '',
      },
      created_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
      },
    });

    await addIndexIfMissing(
      queryInterface,
      'analytics_hotel_view_events',
      ['hotel_id', 'viewed_at'],
      { name: 'idx_analytics_view_hotel_time' }
    );
    await addIndexIfMissing(
      queryInterface,
      'analytics_hotel_view_events',
      ['viewed_at', 'hotel_id'],
      { name: 'idx_analytics_view_time_hotel' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('analytics_hotel_view_events');
    await queryInterface.dropTable('analytics_search_logs');
  },
};
