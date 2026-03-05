const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Country = sequelize.define(
    'countries',
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
        unique: true,
        comment: 'Country display name',
      },
      iso_code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        unique: true,
        comment: 'ISO 3166-1 alpha-2 or alpha-3 code',
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
      tableName: 'countries',
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
          name: 'idx_country_name',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'name' }],
          comment: 'Unique index for country name',
        },
        {
          name: 'idx_country_iso_code',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'iso_code' }],
          comment: 'Unique index for ISO country code',
        },
      ],
    }
  );

  Country.associate = function (models) {
    Country.hasMany(models.cities, {
      foreignKey: 'country_id',
      as: 'cities',
    });
    Country.hasMany(models.hotels, {
      foreignKey: 'country_id',
      as: 'hotels',
    });
  };

  return Country;
};
