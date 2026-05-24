'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payouts', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
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
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Hotel owner or vendor receiving the payout',
      },
      connected_payment_account_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'connected_payment_accounts',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      transaction_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'transactions',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Optional customer payment transaction this payout settles',
      },
      provider: {
        type: Sequelize.ENUM('stripe'),
        allowNull: false,
        defaultValue: 'stripe',
      },
      provider_payout_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'External provider payout ID, if provider creates a payout object',
      },
      provider_transfer_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'External provider transfer ID to the connected account',
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
      platform_fee_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Platform commission or retained amount for this settlement',
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'paid', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      paid_at: {
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

    await queryInterface.addIndex('payouts', ['hotel_id'], {
      name: 'idx_payouts_hotel_id',
    });
    await queryInterface.addIndex('payouts', ['owner_id'], {
      name: 'idx_payouts_owner_id',
    });
    await queryInterface.addIndex('payouts', ['connected_payment_account_id'], {
      name: 'idx_payouts_connected_payment_account_id',
    });
    await queryInterface.addIndex('payouts', ['transaction_id'], {
      name: 'idx_payouts_transaction_id',
    });
    await queryInterface.addIndex('payouts', ['provider_payout_id'], {
      name: 'idx_payouts_provider_payout_id',
      unique: true,
    });
    await queryInterface.addIndex('payouts', ['provider_transfer_id'], {
      name: 'idx_payouts_provider_transfer_id',
      unique: true,
    });
    await queryInterface.addIndex('payouts', ['status'], {
      name: 'idx_payouts_status',
    });
    await queryInterface.addIndex('payouts', ['period_start', 'period_end'], {
      name: 'idx_payouts_period',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payouts');
  },
};
