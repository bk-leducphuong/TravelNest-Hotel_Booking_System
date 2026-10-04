const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const BookingRoom = sequelize.define(
    'booking_rooms',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      room_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'rooms',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      nightly_price_snapshot: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      tableName: 'booking_rooms',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_booking_rooms_booking_id',
          using: 'BTREE',
          fields: [{ name: 'booking_id' }],
        },
        {
          name: 'idx_booking_rooms_room_id',
          using: 'BTREE',
          fields: [{ name: 'room_id' }],
        },
      ],
    }
  );

  BookingRoom.associate = function (models) {
    BookingRoom.belongsTo(models.bookings, {
      foreignKey: 'booking_id',
      as: 'booking',
    });
    BookingRoom.belongsTo(models.rooms, {
      foreignKey: 'room_id',
      as: 'room',
    });
  };

  return BookingRoom;
};
