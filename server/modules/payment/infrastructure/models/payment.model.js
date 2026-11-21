const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

const { CURRENCIES } = require('../../../../constants/common');
const { PAYMENT_METHODS, PAYMENT_STATUSES } = require('../../../../constants/payment');

module.exports = function (sequelize, DataTypes) {
  const Payment = sequelize.define(
    'payments',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
        comment: 'Primary key (UUID v7).',
      },
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'transactions',
          key: 'id',
        },
        comment: 'Parent transaction this payment attempt belongs to.',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Payment amount in the transaction currency.',
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
      payment_method: {
        type: DataTypes.ENUM(...PAYMENT_METHODS),
        allowNull: false,
        comment: 'e.g., card, bank_transfer, wallet',
      },
      payment_status: {
        type: DataTypes.ENUM(...PAYMENT_STATUSES),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current lifecycle status of the payment attempt.',
      },
      stripe_payment_method_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Stripe PaymentMethod ID (pm_xxx) used for the charge.',
      },
      card_brand: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'e.g., visa, mastercard, amex',
      },
      card_last4: {
        type: DataTypes.STRING(4),
        allowNull: true,
        comment: 'Last four digits of the payment card.',
      },
      card_exp_month: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Card expiration month (1-12).',
      },
      card_exp_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Card expiration year (four digits).',
      },
      failure_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Provider error code when the payment attempt fails.',
      },
      failure_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable failure message returned by the provider.',
      },
      receipt_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Provider-hosted URL of the payment receipt.',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional payment metadata.',
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
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the payment was confirmed as paid.',
      },
    },
    {
      sequelize,
      tableName: 'payments',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'transaction_id',
          using: 'BTREE',
          fields: [{ name: 'transaction_id' }],
        },
        {
          name: 'payment_status',
          using: 'BTREE',
          fields: [{ name: 'payment_status' }],
        },
        {
          name: 'stripe_payment_method_id',
          using: 'BTREE',
          fields: [{ name: 'stripe_payment_method_id' }],
        },
      ],
    }
  );

  Payment.associate = function (models) {
    Payment.belongsTo(models.transactions, {
      foreignKey: 'transaction_id',
      as: 'transaction',
    });
    Payment.hasMany(models.ledger_entries, {
      foreignKey: 'payment_id',
      as: 'ledger_entries',
    });
  };

  return Payment;
};
