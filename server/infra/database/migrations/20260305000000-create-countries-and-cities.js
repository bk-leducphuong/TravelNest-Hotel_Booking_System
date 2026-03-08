'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create countries table
    await queryInterface.createTable('countries', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true,
        comment: 'Country display name',
      },
      iso_code: {
        type: Sequelize.STRING(3),
        allowNull: false,
        unique: true,
        comment: 'ISO 3166-1 alpha-2 or alpha-3 code',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('countries', ['name'], {
      name: 'idx_country_name',
      unique: true,
      comment: 'Unique index for country name',
    });

    await queryInterface.addIndex('countries', ['iso_code'], {
      name: 'idx_country_iso_code',
      unique: true,
      comment: 'Unique index for ISO country code',
    });

    // Create cities table
    await queryInterface.createTable('cities', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'City name',
      },
      country_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'countries',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'FK to countries.id',
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
        comment: 'SEO-friendly slug, unique per city',
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
        comment: 'Latitude for map search and distance calculations',
      },
      longitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
        comment: 'Longitude for map search and distance calculations',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('cities', ['name', 'country_id'], {
      name: 'idx_city_name_country',
      unique: true,
      comment: 'Unique city name per country',
    });

    await queryInterface.addIndex('cities', ['slug'], {
      name: 'idx_city_slug',
      unique: true,
      comment: 'Unique index for city slug',
    });

    await queryInterface.addIndex('cities', ['country_id'], {
      name: 'idx_city_country',
      comment: 'Index for filtering by country',
    });

    await queryInterface.addIndex('cities', ['latitude', 'longitude'], {
      name: 'idx_city_coordinates',
      comment: 'Index for geospatial queries',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('cities');
    await queryInterface.dropTable('countries');
  },
};

