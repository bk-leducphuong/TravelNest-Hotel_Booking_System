const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Destination = sequelize.define(
    'destinations',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      type: {
        type: DataTypes.ENUM('city', 'country'),
        allowNull: false,
        comment: 'Destination type (city or country)',
      },
      city_id: {
        type: DataTypes.UUID,
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
        type: DataTypes.UUID,
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
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'Destination name shown to users',
      },
      normalized_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Lowercased, accent-stripped name for fast search',
      },
      slug: {
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
        comment: 'SEO-friendly slug for URLs',
      },
      country_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: 'Denormalized country name for display',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether destination is active/available for search',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      tableName: 'destinations',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_destination_type_city',
          using: 'BTREE',
          fields: [{ name: 'type' }, { name: 'city_id' }],
          comment: 'Lookup by city destination',
        },
        {
          name: 'idx_destination_type_country',
          using: 'BTREE',
          fields: [{ name: 'type' }, { name: 'country_id' }],
          comment: 'Lookup by country destination',
        },
        {
          name: 'idx_destination_normalized_name',
          using: 'BTREE',
          fields: [{ name: 'normalized_name' }],
          comment: 'Fast search by normalized name',
        },
        {
          name: 'idx_destination_slug',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'slug' }],
          comment: 'Unique index for destination slug',
        },
        {
          name: 'idx_destination_active',
          using: 'BTREE',
          fields: [{ name: 'is_active' }],
          comment: 'Filter active destinations',
        },
      ],
    }
  );

  Destination.associate = function (models) {
    Destination.belongsTo(models.cities, {
      foreignKey: 'city_id',
      as: 'city',
    });
    Destination.belongsTo(models.countries, {
      foreignKey: 'country_id',
      as: 'country',
    });
  };

  return Destination;
};

