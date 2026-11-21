const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Transaction = sequelize.define(
    'transactions',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
        comment: 'Primary key (UUID v7).',
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
        comment: 'Booking this transaction belongs to; null for non-booking money movements.',
      },
      buyer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User who pays for the transaction.',
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        comment: 'Hotel the transaction funds are attributed to.',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Transaction amount in the transaction currency.',
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        comment: 'ISO 4217 three-letter currency code.',
      },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'processing',
          'completed',
          'failed',
          'cancelled',
          'refunded',
          'partially_refunded'
        ),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Overall lifecycle status of the transaction.',
      },
      transaction_type: {
        type: DataTypes.ENUM('payment', 'refund', 'payout'),
        allowNull: false,
        defaultValue: 'payment',
        comment: 'Kind of money movement: payment, refund, or payout.',
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'e.g., card, bank_transfer, wallet',
      },
      stripe_payment_intent_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Stripe PaymentIntent ID linked to the transaction (unique).',
      },
      stripe_charge_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Stripe Charge ID created for the transaction.',
      },
      stripe_customer_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Stripe Customer ID the transaction was charged to.',
      },
      stripe_refund_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Stripe Refund ID when the transaction was refunded.',
      },
      failure_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Provider error code when the transaction fails.',
      },
      failure_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable failure message returned by the provider.',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional transaction metadata',
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
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the transaction reached a terminal successful state.',
      },
    },
    {
      sequelize,
      tableName: 'transactions',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'booking_id',
          using: 'BTREE',
          fields: [{ name: 'booking_id' }],
        },
        {
          name: 'buyer_id',
          using: 'BTREE',
          fields: [{ name: 'buyer_id' }],
        },
        {
          name: 'hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
        {
          name: 'stripe_payment_intent_id',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'stripe_payment_intent_id' }],
        },
        {
          name: 'status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
        },
        {
          name: 'transaction_type',
          using: 'BTREE',
          fields: [{ name: 'transaction_type' }],
        },
      ],
    }
  );

  Transaction.associate = function (models) {
    Transaction.belongsTo(models.bookings, {
      foreignKey: 'booking_id',
      as: 'booking',
    });
    Transaction.belongsTo(models.users, {
      foreignKey: 'buyer_id',
      as: 'transaction_buyer', // Changed from 'buyer' to avoid conflict with Booking.buyer
    });
    Transaction.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    Transaction.hasOne(models.invoices, {
      foreignKey: 'transaction_id',
      as: 'invoice',
    });
    Transaction.hasMany(models.payments, {
      foreignKey: 'transaction_id',
      as: 'payments',
    });
    Transaction.hasMany(models.refunds, {
      foreignKey: 'transaction_id',
      as: 'refunds',
    });
    Transaction.hasMany(models.payouts, {
      foreignKey: 'transaction_id',
      as: 'payouts',
    });
    Transaction.hasMany(models.ledger_entries, {
      foreignKey: 'transaction_id',
      as: 'ledger_entries',
    });
  };

  return Transaction;
};
