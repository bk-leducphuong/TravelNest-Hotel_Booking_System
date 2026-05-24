'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('refunds', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      transaction_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'transactions',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      buyer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      hotel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      provider: {
        type: Sequelize.ENUM('stripe'),
        allowNull: false,
        defaultValue: 'stripe',
      },
      provider_refund_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'External refund ID from the payment provider',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      reason: {
        type: Sequelize.ENUM(
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
        type: Sequelize.ENUM('eligible', 'ineligible', 'manual_review'),
        allowNull: false,
        defaultValue: 'manual_review',
      },
      free_cancellation_deadline: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      requested_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failure_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      failure_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('refunds', ['booking_id'], {
      name: 'idx_refunds_booking_id',
    });
    await queryInterface.addIndex('refunds', ['transaction_id'], {
      name: 'idx_refunds_transaction_id',
    });
    await queryInterface.addIndex('refunds', ['buyer_id'], {
      name: 'idx_refunds_buyer_id',
    });
    await queryInterface.addIndex('refunds', ['hotel_id'], {
      name: 'idx_refunds_hotel_id',
    });
    await queryInterface.addIndex('refunds', ['provider_refund_id'], {
      name: 'idx_refunds_provider_refund_id',
      unique: true,
    });
    await queryInterface.addIndex('refunds', ['status'], {
      name: 'idx_refunds_status',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('refunds');
  },
};
