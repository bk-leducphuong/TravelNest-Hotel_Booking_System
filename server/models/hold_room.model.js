const { uuidv7 } = require('uuidv7');

/**
 * Junction table: which rooms (and quantity) are part of a hold.
 * One hold can hold multiple room types.
 */
module.exports = function (sequelize, DataTypes) {
  const HoldRoom = sequelize.define(
    'hold_rooms',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      hold_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'holds',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      room_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'rooms',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
        comment: 'Number of rooms of this type held',
      },
    },
    {
      sequelize,
      tableName: 'hold_rooms',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_hold_rooms_hold_id',
          using: 'BTREE',
          fields: [{ name: 'hold_id' }],
        },
      ],
    }
  );

  HoldRoom.associate = function (models) {
    HoldRoom.belongsTo(models.holds, {
      foreignKey: 'hold_id',
      as: 'hold',
    });
    HoldRoom.belongsTo(models.rooms, {
      foreignKey: 'room_id',
      as: 'room',
    });
  };

  return HoldRoom;
};
