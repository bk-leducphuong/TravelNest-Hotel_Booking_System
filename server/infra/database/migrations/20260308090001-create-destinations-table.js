'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('destinations', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      type: {
        type: Sequelize.ENUM('city', 'country'),
        allowNull: false,
        comment: 'Destination type (city or country)',
      },
      city_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'cities',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK to cities.id when type = city',
      },
      country_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'countries',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'FK to countries.id when type = country',
      },
      display_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Destination name shown to users',
      },
      normalized_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Lowercased, accent-stripped name for fast search',
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
        comment: 'SEO-friendly slug for URLs',
      },
      country_name: {
        type: Sequelize.STRING(150),
        allowNull: true,
        comment: 'Denormalized country name for display',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether destination is active/available for search',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('destinations', ['type', 'city_id'], {
      name: 'idx_destination_type_city',
      using: 'BTREE',
    });

    await queryInterface.addIndex('destinations', ['type', 'country_id'], {
      name: 'idx_destination_type_country',
      using: 'BTREE',
    });

    await queryInterface.addIndex('destinations', ['normalized_name'], {
      name: 'idx_destination_normalized_name',
      using: 'BTREE',
    });

    await queryInterface.addIndex('destinations', ['slug'], {
      name: 'idx_destination_slug',
      unique: true,
      using: 'BTREE',
    });

    await queryInterface.addIndex('destinations', ['is_active'], {
      name: 'idx_destination_active',
      using: 'BTREE',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('destinations', 'idx_destination_type_city');
    await queryInterface.removeIndex('destinations', 'idx_destination_type_country');
    await queryInterface.removeIndex('destinations', 'idx_destination_normalized_name');
    await queryInterface.removeIndex('destinations', 'idx_destination_slug');
    await queryInterface.removeIndex('destinations', 'idx_destination_active');

    await queryInterface.dropTable('destinations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_destinations_type";');
  },
};

