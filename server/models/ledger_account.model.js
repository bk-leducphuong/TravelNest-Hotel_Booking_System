const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

const { CURRENCIES } = require('../constants/common');
const { LEDGER_ACCOUNT_TYPES, LEDGER_OWNER_TYPES } = require('../constants/ledger');

module.exports = function (sequelize, DataTypes) {
  const LedgerAccount = sequelize.define(
    'ledger_accounts',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      account_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Deterministic unique key for account type, owner, and currency',
      },
      account_type: {
        type: DataTypes.ENUM(...LEDGER_ACCOUNT_TYPES),
        allowNull: false,
      },
      owner_type: {
        type: DataTypes.ENUM(...LEDGER_OWNER_TYPES),
        allowNull: false,
      },
      owner_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User, hotel, or provider ID depending on owner_type; null for platform',
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
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
      tableName: 'ledger_accounts',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_ledger_accounts_account_key',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'account_key' }],
        },
        {
          name: 'idx_ledger_accounts_owner',
          using: 'BTREE',
          fields: [{ name: 'owner_type' }, { name: 'owner_id' }],
        },
        {
          name: 'idx_ledger_accounts_type_currency',
          using: 'BTREE',
          fields: [{ name: 'account_type' }, { name: 'currency' }],
        },
      ],
    }
  );

  LedgerAccount.associate = function (models) {
    LedgerAccount.hasMany(models.ledger_entries, {
      foreignKey: 'ledger_account_id',
      as: 'entries',
    });
  };

  return LedgerAccount;
};
