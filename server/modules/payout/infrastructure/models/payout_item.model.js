const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const PayoutItem = sequelize.define(
    'payout_items',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      payout_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'payouts',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'transactions',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      gross_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      platform_fee_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      net_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
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
      tableName: 'payout_items',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_payout_items_payout_id',
          using: 'BTREE',
          fields: [{ name: 'payout_id' }],
        },
        {
          name: 'idx_payout_items_booking_id',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'booking_id' }],
        },
      ],
    }
  );

  PayoutItem.associate = function (models) {
    PayoutItem.belongsTo(models.payouts, {
      foreignKey: 'payout_id',
      as: 'payout',
    });
    PayoutItem.belongsTo(models.bookings, {
      foreignKey: 'booking_id',
      as: 'booking',
    });
    PayoutItem.belongsTo(models.transactions, {
      foreignKey: 'transaction_id',
      as: 'transaction',
    });
  };

  return PayoutItem;
};
