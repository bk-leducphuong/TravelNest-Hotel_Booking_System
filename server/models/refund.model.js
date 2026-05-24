const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Refund = sequelize.define(
    'refunds',
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
      },
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'transactions',
          key: 'id',
        },
      },
      buyer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
      },
      provider: {
        type: DataTypes.ENUM('stripe'),
        allowNull: false,
        defaultValue: 'stripe',
      },
      provider_refund_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'External refund ID from the payment provider',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      reason: {
        type: DataTypes.ENUM(
          'free_cancellation',
          'customer_request',
          'hotel_cancelled',
          'duplicate',
          'fraudulent',
          'other'
        ),
        allowNull: false,
        defaultValue: 'customer_request',
      },
      eligibility: {
        type: DataTypes.ENUM('eligible', 'ineligible', 'manual_review'),
        allowNull: false,
        defaultValue: 'manual_review',
      },
      free_cancellation_deadline: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      requested_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      processed_at: {
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
      tableName: 'refunds',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_refunds_booking_id',
          using: 'BTREE',
          fields: [{ name: 'booking_id' }],
        },
        {
          name: 'idx_refunds_transaction_id',
          using: 'BTREE',
          fields: [{ name: 'transaction_id' }],
        },
        {
          name: 'idx_refunds_buyer_id',
          using: 'BTREE',
          fields: [{ name: 'buyer_id' }],
        },
        {
          name: 'idx_refunds_hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
        {
          name: 'idx_refunds_provider_refund_id',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'provider_refund_id' }],
        },
        {
          name: 'idx_refunds_status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
        },
      ],
    }
  );

  Refund.associate = function (models) {
    Refund.belongsTo(models.bookings, {
      foreignKey: 'booking_id',
      as: 'booking',
    });
    Refund.belongsTo(models.transactions, {
      foreignKey: 'transaction_id',
      as: 'transaction',
    });
    Refund.belongsTo(models.users, {
      foreignKey: 'buyer_id',
      as: 'buyer',
    });
    Refund.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    Refund.hasMany(models.ledger_entries, {
      foreignKey: 'refund_id',
      as: 'ledger_entries',
    });
  };

  return Refund;
};
