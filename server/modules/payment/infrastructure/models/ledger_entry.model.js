const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

const { CURRENCIES } = require('../../../../constants/common');
const { LEDGER_ENTRY_DIRECTIONS, LEDGER_EVENT_TYPES } = require('../../../../constants/ledger');
const { PAYMENT_ACCOUNT_PROVIDERS } = require('../../../../constants/payment');

module.exports = function (sequelize, DataTypes) {
  const LedgerEntry = sequelize.define(
    'ledger_entries',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
        comment: 'Primary key (UUID v7).',
      },
      ledger_account_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'ledger_accounts',
          key: 'id',
        },
        comment: 'Ledger account this entry posts to.',
      },
      entry_group_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Shared ID for all debit and credit rows in one accounting event',
      },
      entry_group_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Stable event key used to make ledger posting idempotent',
      },
      direction: {
        type: DataTypes.ENUM(...LEDGER_ENTRY_DIRECTIONS),
        allowNull: false,
        comment: 'Debit or credit direction of the entry.',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Entry amount in the entry currency.',
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
        comment: 'ISO 4217 three-letter currency code.',
      },
      event_type: {
        type: DataTypes.ENUM(...LEDGER_EVENT_TYPES),
        allowNull: false,
        comment: 'Business event that produced the ledger entry.',
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
        comment: 'Related booking, when applicable.',
      },
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'transactions',
          key: 'id',
        },
        comment: 'Related transaction, when applicable.',
      },
      payment_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'payments',
          key: 'id',
        },
        comment: 'Related payment, when applicable.',
      },
      refund_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'refunds',
          key: 'id',
        },
        comment: 'Related refund, when applicable.',
      },
      payout_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'payouts',
          key: 'id',
        },
        comment: 'Related payout, when applicable.',
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'hotels',
          key: 'id',
        },
        comment: 'Hotel the entry is attributed to, when applicable.',
      },
      buyer_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'Buyer the entry is attributed to, when applicable.',
      },
      owner_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'Owner (hotel or provider owner) the entry is attributed to, when applicable.',
      },
      provider: {
        type: DataTypes.ENUM(...PAYMENT_ACCOUNT_PROVIDERS),
        allowNull: true,
        comment: 'Payment provider that produced the underlying money movement.',
      },
      provider_event_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Provider event ID that triggered the entry.',
      },
      provider_balance_transaction_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Provider balance transaction backing the entry.',
      },
      idempotency_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Unique key making the ledger posting idempotent.',
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Human-readable description of the entry.',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional ledger entry metadata.',
      },
      posted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Accounting posting timestamp.',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Row creation timestamp.',
      },
    },
    {
      sequelize,
      tableName: 'ledger_entries',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_ledger_entries_account_id',
          using: 'BTREE',
          fields: [{ name: 'ledger_account_id' }],
        },
        {
          name: 'idx_ledger_entries_group_id',
          using: 'BTREE',
          fields: [{ name: 'entry_group_id' }],
        },
        {
          name: 'idx_ledger_entries_group_key',
          using: 'BTREE',
          fields: [{ name: 'entry_group_key' }],
        },
        {
          name: 'idx_ledger_entries_idempotency_key',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'idempotency_key' }],
        },
        {
          name: 'idx_ledger_entries_refs',
          using: 'BTREE',
          fields: [{ name: 'booking_id' }, { name: 'transaction_id' }],
        },
        {
          name: 'idx_ledger_entries_refund_id',
          using: 'BTREE',
          fields: [{ name: 'refund_id' }],
        },
        {
          name: 'idx_ledger_entries_payout_id',
          using: 'BTREE',
          fields: [{ name: 'payout_id' }],
        },
        {
          name: 'idx_ledger_entries_hotel_posted',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'posted_at' }],
        },
      ],
    }
  );

  LedgerEntry.associate = function (models) {
    LedgerEntry.belongsTo(models.ledger_accounts, {
      foreignKey: 'ledger_account_id',
      as: 'ledger_account',
    });
    LedgerEntry.belongsTo(models.bookings, { foreignKey: 'booking_id', as: 'booking' });
    LedgerEntry.belongsTo(models.transactions, {
      foreignKey: 'transaction_id',
      as: 'transaction',
    });
    LedgerEntry.belongsTo(models.payments, { foreignKey: 'payment_id', as: 'payment' });
    LedgerEntry.belongsTo(models.refunds, { foreignKey: 'refund_id', as: 'refund' });
    LedgerEntry.belongsTo(models.payouts, { foreignKey: 'payout_id', as: 'payout' });
    LedgerEntry.belongsTo(models.hotels, { foreignKey: 'hotel_id', as: 'hotel' });
    LedgerEntry.belongsTo(models.users, { foreignKey: 'buyer_id', as: 'buyer' });
    LedgerEntry.belongsTo(models.users, { foreignKey: 'owner_id', as: 'owner' });
  };

  return LedgerEntry;
};
