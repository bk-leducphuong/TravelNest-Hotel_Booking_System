const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const RoomAmenity = sequelize.define(
    'room_amenities',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      room_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'rooms',
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
        comment: 'Whether the amenity is currently available in this room',
      },
      additional_info: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional information specific to this room (e.g., "King size bed")',
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
      tableName: 'room_amenities',
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
          name: 'idx_room_id',
          using: 'BTREE',
          fields: [{ name: 'room_id' }],
          comment: 'Index for fetching all amenities of a room',
        },
        {
          name: 'idx_amenity_id',
          using: 'BTREE',
          fields: [{ name: 'amenity_id' }],
          comment: 'Index for finding rooms with specific amenity',
        },
        {
          name: 'idx_room_amenity_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'room_id' }, { name: 'amenity_id' }],
          comment: 'Prevent duplicate amenities for the same room',
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

  RoomAmenity.associate = function (models) {
    RoomAmenity.belongsTo(models.rooms, {
      foreignKey: 'room_id',
      as: 'room',
    });
    RoomAmenity.belongsTo(models.amenities, {
      foreignKey: 'amenity_id',
      as: 'amenity',
    });
  };

  return RoomAmenity;
};
