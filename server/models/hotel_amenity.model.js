const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const HotelAmenity = sequelize.define(
    'hotel_amenities',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      amenity_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'amenities',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Reference to the amenities table',
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the amenity is currently available at this hotel',
      },
      is_free: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
        comment: 'Whether the amenity is free or requires payment',
      },
      additional_info: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional information specific to this hotel (e.g., "Pool open 6am-10pm")',
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
      tableName: 'hotel_amenities',
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
          name: 'idx_hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
          comment: 'Index for fetching all amenities of a hotel',
        },
        {
          name: 'idx_amenity_id',
          using: 'BTREE',
          fields: [{ name: 'amenity_id' }],
          comment: 'Index for finding hotels with specific amenity',
        },
        {
          name: 'idx_hotel_amenity_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'amenity_id' }],
          comment: 'Prevent duplicate amenities for the same hotel',
        },
        {
          name: 'idx_available',
          using: 'BTREE',
          fields: [{ name: 'is_available' }],
          comment: 'Index for filtering available amenities',
        },
      ],
    }
  );

  HotelAmenity.associate = function (models) {
    HotelAmenity.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    HotelAmenity.belongsTo(models.amenities, {
      foreignKey: 'amenity_id',
      as: 'amenity',
    });
  };

  return HotelAmenity;
};
