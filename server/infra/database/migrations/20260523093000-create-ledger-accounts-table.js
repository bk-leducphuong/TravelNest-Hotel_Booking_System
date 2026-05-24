'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ledger_accounts', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      account_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Deterministic unique key for account type, owner, and currency',
      },
      account_type: {
        type: Sequelize.ENUM(
          'platform_cash',
          'platform_revenue',
          'customer_receivable',
          'hotel_owner_payable',
          'refund_liability',
          'payment_provider_clearing'
        ),
        allowNull: false,
      },
      owner_type: {
        type: Sequelize.ENUM('platform', 'user', 'hotel', 'provider'),
        allowNull: false,
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'User, hotel, or provider ID depending on owner_type; null for platform',
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
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

    await queryInterface.addIndex('ledger_accounts', ['account_key'], {
      name: 'idx_ledger_accounts_account_key',
      unique: true,
    });
    await queryInterface.addIndex('ledger_accounts', ['owner_type', 'owner_id'], {
      name: 'idx_ledger_accounts_owner',
    });
    await queryInterface.addIndex('ledger_accounts', ['account_type', 'currency'], {
      name: 'idx_ledger_accounts_type_currency',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ledger_accounts');
  },
};
