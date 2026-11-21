const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

const { CURRENCIES } = require('../../../../constants/common');
const {
  PAYMENT_ACCOUNT_ONBOARDING_STATUSES,
  PAYMENT_ACCOUNT_PROVIDERS,
  PAYMENT_ACCOUNT_TYPES,
} = require('../../../../constants/payment');

module.exports = function (sequelize, DataTypes) {
  const ConnectedPaymentAccount = sequelize.define(
    'connected_payment_accounts',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
        comment: 'Primary key (UUID v7).',
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Owner user who receives payouts through this connected account',
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Optional hotel-specific payout routing target',
      },
      provider: {
        type: DataTypes.ENUM(...PAYMENT_ACCOUNT_PROVIDERS),
        allowNull: false,
        defaultValue: 'stripe',
        comment: 'External payment provider for the connected account',
      },
      provider_account_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Provider connected account ID, e.g. Stripe acct_xxx',
      },
      account_type: {
        type: DataTypes.ENUM(...PAYMENT_ACCOUNT_TYPES),
        allowNull: false,
        defaultValue: 'express',
        comment: 'Connected account type at the provider',
      },
      country: {
        type: DataTypes.STRING(2),
        allowNull: true,
        validate: {
          len: [2, 2],
        },
        comment: 'Two-letter ISO country code of the connected account.',
      },
      default_currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        validate: {
          isValidCurrency(value) {
            if (value && !CURRENCIES.includes(value)) {
              throw new Error('invalid currency');
            }
          },
        },
        comment: 'Default ISO 4217 currency used for charges and payouts.',
      },
      charges_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the provider allows charges on this account.',
      },
      payouts_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the provider allows payouts from this account.',
      },
      details_submitted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether onboarding details have been submitted to the provider.',
      },
      onboarding_status: {
        type: DataTypes.ENUM(...PAYMENT_ACCOUNT_ONBOARDING_STATUSES),
        allowNull: false,
        defaultValue: 'not_started',
        comment: 'Local summary of provider onboarding and payout readiness',
      },
      disabled_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Reason the provider disabled the account, when applicable.',
      },
      requirements_currently_due: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Onboarding requirements currently blocking the account.',
      },
      requirements_eventually_due: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Onboarding requirements that must be satisfied later.',
      },
      capabilities: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Provider capability payload used for payout readiness checks',
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Preferred payout account for this owner or hotel; enforced at application level',
      },
      last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time provider account status was synced',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional connected account metadata.',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Row creation timestamp.',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Row last update timestamp.',
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Soft-delete timestamp.',
      },
    },
    {
      sequelize,
      tableName: 'connected_payment_accounts',
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_connected_payment_accounts_user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
        },
        {
          name: 'idx_connected_payment_accounts_hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
        {
          name: 'idx_connected_payment_accounts_provider_account_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'provider' }, { name: 'provider_account_id' }],
        },
        {
          name: 'idx_connected_payment_accounts_payout_ready',
          using: 'BTREE',
          fields: [{ name: 'payouts_enabled' }, { name: 'onboarding_status' }],
        },
        {
          name: 'idx_connected_payment_accounts_default',
          using: 'BTREE',
          fields: [{ name: 'user_id' }, { name: 'hotel_id' }, { name: 'is_default' }],
        },
      ],
    }
  );

  ConnectedPaymentAccount.associate = function (models) {
    ConnectedPaymentAccount.belongsTo(models.users, {
      foreignKey: 'user_id',
      as: 'owner',
    });

    ConnectedPaymentAccount.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });

    ConnectedPaymentAccount.hasMany(models.payouts, {
      foreignKey: 'connected_payment_account_id',
      as: 'payouts',
    });
  };

  return ConnectedPaymentAccount;
};
