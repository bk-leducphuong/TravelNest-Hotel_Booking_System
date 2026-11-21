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
        comment: 'Primary key (UUID v7).',
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        comment: 'Booking the refund is issued for.',
      },
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'transactions',
          key: 'id',
        },
        comment: 'Original transaction being refunded.',
      },
      buyer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User who receives the refund.',
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        comment: 'Hotel whose funds are being refunded.',
      },
      provider: {
        type: DataTypes.ENUM('stripe'),
        allowNull: false,
        defaultValue: 'stripe',
        comment: 'Payment provider processing the refund.',
      },
      idempotency_key: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Client-supplied key preventing duplicate refunds.',
      },
      workflow_state: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: 'Internal workflow state of the refund job.',
      },
      attempt_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of processing attempts made so far.',
      },
      first_attempt_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of the first processing attempt.',
      },
      next_retry_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the next retry is due.',
      },
      lease_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Lease expiry timestamp for the worker processing the refund.',
      },
      lease_token: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Token identifying the worker that holds the processing lease.',
      },
      provider_refund_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'External refund ID from the payment provider',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Refund amount in the refund currency.',
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        comment: 'ISO 4217 three-letter currency code.',
      },
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current lifecycle status of the refund.',
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
        comment: 'Business reason why the refund was issued.',
      },
      eligibility: {
        type: DataTypes.ENUM('eligible', 'ineligible', 'manual_review'),
        allowNull: false,
        defaultValue: 'manual_review',
        comment: 'Refund policy eligibility outcome for the booking.',
      },
      free_cancellation_deadline: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Deadline until which a free cancellation refund is allowed.',
      },
      requested_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the refund was requested.',
      },
      processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the refund finished processing.',
      },
      failure_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Provider error code when the refund fails.',
      },
      failure_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable failure message returned by the provider.',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional refund metadata.',
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
        {
          name: 'refund_operation_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'idempotency_key' }],
        },
        {
          name: 'refund_recovery_due',
          using: 'BTREE',
          fields: [{ name: 'status' }, { name: 'next_retry_at' }],
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
