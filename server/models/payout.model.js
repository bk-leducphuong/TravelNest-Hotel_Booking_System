const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

const { CURRENCIES } = require('../constants/common');
const { PAYMENT_ACCOUNT_PROVIDERS, PAYOUT_STATUSES } = require('../constants/payment');

module.exports = function (sequelize, DataTypes) {
  const Payout = sequelize.define(
    'payouts',
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
      owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'Hotel owner or vendor receiving the payout',
      },
      connected_payment_account_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'connected_payment_accounts',
          key: 'id',
        },
      },
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'transactions',
          key: 'id',
        },
        comment: 'Optional customer payment transaction this payout settles',
      },
      provider: {
        type: DataTypes.ENUM(...PAYMENT_ACCOUNT_PROVIDERS),
        allowNull: false,
        defaultValue: 'stripe',
      },
      provider_payout_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'External provider payout ID, if provider creates a payout object',
      },
      provider_transfer_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'External provider transfer ID to the connected account',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        validate: {
          isValidCurrency(value) {
            if (!CURRENCIES.includes(value)) {
              throw new Error('invalid currency');
            }
          },
        },
      },
      platform_fee_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Platform commission or retained amount for this settlement',
      },
      status: {
        type: DataTypes.ENUM(...PAYOUT_STATUSES),
        allowNull: false,
        defaultValue: 'pending',
      },
      period_start: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      period_end: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      failure_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      failure_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
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
      tableName: 'payouts',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_payouts_hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
        {
          name: 'idx_payouts_owner_id',
          using: 'BTREE',
          fields: [{ name: 'owner_id' }],
        },
        {
          name: 'idx_payouts_connected_payment_account_id',
          using: 'BTREE',
          fields: [{ name: 'connected_payment_account_id' }],
        },
        {
          name: 'idx_payouts_transaction_id',
          using: 'BTREE',
          fields: [{ name: 'transaction_id' }],
        },
        {
          name: 'idx_payouts_provider_payout_id',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'provider_payout_id' }],
        },
        {
          name: 'idx_payouts_provider_transfer_id',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'provider_transfer_id' }],
        },
        {
          name: 'idx_payouts_status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
        },
        {
          name: 'idx_payouts_period',
          using: 'BTREE',
          fields: [{ name: 'period_start' }, { name: 'period_end' }],
        },
      ],
    }
  );

  Payout.associate = function (models) {
    Payout.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    Payout.belongsTo(models.users, {
      foreignKey: 'owner_id',
      as: 'owner',
    });
    Payout.belongsTo(models.connected_payment_accounts, {
      foreignKey: 'connected_payment_account_id',
      as: 'connected_payment_account',
    });
    Payout.belongsTo(models.transactions, {
      foreignKey: 'transaction_id',
      as: 'transaction',
    });
    Payout.hasMany(models.ledger_entries, {
      foreignKey: 'payout_id',
      as: 'ledger_entries',
    });
    Payout.hasMany(models.payout_items, {
      foreignKey: 'payout_id',
      as: 'items',
    });
  };

  return Payout;
};
