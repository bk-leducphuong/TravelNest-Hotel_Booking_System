const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const City = sequelize.define(
    'cities',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'City name',
      },
      country_id: {
        type: DataTypes.UUID,
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
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
        comment: 'SEO-friendly slug, unique per city',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        comment: 'Latitude for map search and distance calculations',
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        comment: 'Longitude for map search and distance calculations',
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
      tableName: 'cities',
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
          name: 'idx_city_name_country',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'name' }, { name: 'country_id' }],
          comment: 'Unique city name per country',
        },
        {
          name: 'idx_city_slug',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'slug' }],
          comment: 'Unique index for city slug',
        },
        {
          name: 'idx_city_country',
          using: 'BTREE',
          fields: [{ name: 'country_id' }],
          comment: 'Index for filtering by country',
        },
        {
          name: 'idx_city_coordinates',
          using: 'BTREE',
          fields: [{ name: 'latitude' }, { name: 'longitude' }],
          comment: 'Index for geospatial queries',
        },
      ],
    }
  );

  City.associate = function (models) {
    City.belongsTo(models.countries, {
      foreignKey: 'country_id',
      as: 'country',
    });
    City.hasMany(models.hotels, {
      foreignKey: 'city_id',
      as: 'hotels',
    });
  };

  return City;
};
