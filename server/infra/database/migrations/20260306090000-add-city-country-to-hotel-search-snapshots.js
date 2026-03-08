'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add city_id and country_id columns
    await queryInterface.addColumn('hotel_search_snapshots', 'city_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'cities',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK to cities.id for normalized location',
    });

    await queryInterface.addColumn('hotel_search_snapshots', 'country_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'countries',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK to countries.id for normalized country',
    });

    // Indexes for new foreign keys
    await queryInterface.addIndex('hotel_search_snapshots', ['city_id'], {
      name: 'idx_city_id_hss',
      using: 'BTREE',
    });

    await queryInterface.addIndex('hotel_search_snapshots', ['country_id'], {
      name: 'idx_country_id_hss',
      using: 'BTREE',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('hotel_search_snapshots', 'idx_city_id_hss');
    await queryInterface.removeIndex('hotel_search_snapshots', 'idx_country_id_hss');

    await queryInterface.removeColumn('hotel_search_snapshots', 'city_id');
    await queryInterface.removeColumn('hotel_search_snapshots', 'country_id');
  },
};
