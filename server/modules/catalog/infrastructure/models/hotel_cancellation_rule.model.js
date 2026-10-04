const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const HotelCancellationRule = sequelize.define(
    'hotel_cancellation_rules',
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
      },
      room_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'rooms',
          key: 'id',
        },
        comment: 'Null means hotel-wide default rule',
      },
      is_refundable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      free_cancellation_until_hours_before_checkin: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Hours before check-in when full free cancellation ends',
      },
      refund_percent_before_deadline: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 100.0,
      },
      refund_percent_after_deadline: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      cancellation_fee_type: {
        type: DataTypes.ENUM('none', 'percentage'),
        allowNull: false,
        defaultValue: 'none',
      },
      cancellation_fee_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: 'hotel_cancellation_rules',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_hotel_cancellation_rules_hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
        {
          name: 'idx_hotel_cancellation_rules_room_id',
          using: 'BTREE',
          fields: [{ name: 'room_id' }],
        },
        {
          name: 'idx_hotel_cancellation_rules_scope_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'room_id' }],
        },
        {
          name: 'idx_hotel_cancellation_rules_active',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'is_active' }],
        },
      ],
    }
  );

  HotelCancellationRule.associate = function (models) {
    HotelCancellationRule.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    HotelCancellationRule.belongsTo(models.rooms, {
      foreignKey: 'room_id',
      as: 'room',
    });
  };

  return HotelCancellationRule;
};
