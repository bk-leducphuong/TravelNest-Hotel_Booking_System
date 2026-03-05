'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new FK columns
    await queryInterface.addColumn('hotels', 'country_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'countries',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK to countries.id',
    });

    await queryInterface.addColumn('hotels', 'city_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'cities',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK to cities.id',
    });

    // Indexes for new FKs
    await queryInterface.addIndex('hotels', ['city_id'], {
      name: 'idx_city_id',
      comment: 'Index for city-based searches (FK to cities)',
    });

    await queryInterface.addIndex('hotels', ['country_id'], {
      name: 'idx_country_id',
      comment: 'Index for country-based filtering (FK to countries)',
    });

    // NOTE:
    // We are not automatically migrating existing string-based city/country data here
    // because mapping to normalized tables depends on your dataset and desired behavior.
    // You can add a follow-up data migration to backfill city_id/country_id if needed.
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('hotels', 'idx_city_id');
    await queryInterface.removeIndex('hotels', 'idx_country_id');

    await queryInterface.removeColumn('hotels', 'city_id');
    await queryInterface.removeColumn('hotels', 'country_id');
  },
};

