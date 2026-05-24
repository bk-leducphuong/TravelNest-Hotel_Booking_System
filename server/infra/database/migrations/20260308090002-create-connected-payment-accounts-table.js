'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('connected_payment_accounts', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
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
        type: Sequelize.UUID,
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
        type: Sequelize.ENUM('stripe'),
        allowNull: false,
        defaultValue: 'stripe',
        comment: 'External payment provider for the connected account',
      },
      provider_account_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Provider connected account ID, e.g. Stripe acct_xxx',
      },
      account_type: {
        type: Sequelize.ENUM('express', 'standard', 'custom'),
        allowNull: false,
        defaultValue: 'express',
        comment: 'Connected account type at the provider',
      },
      country: {
        type: Sequelize.STRING(2),
        allowNull: true,
      },
      default_currency: {
        type: Sequelize.STRING(3),
        allowNull: true,
      },
      charges_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      payouts_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      details_submitted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      onboarding_status: {
        type: Sequelize.ENUM('not_started', 'pending', 'completed', 'restricted', 'disabled'),
        allowNull: false,
        defaultValue: 'not_started',
        comment: 'Local summary of provider onboarding and payout readiness',
      },
      disabled_reason: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      requirements_currently_due: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      requirements_eventually_due: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      capabilities: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Provider capability payload used for payout readiness checks',
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Preferred payout account for this owner or hotel; enforced at application level',
      },
      last_synced_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time provider account status was synced',
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('connected_payment_accounts', ['user_id'], {
      name: 'idx_connected_payment_accounts_user_id',
    });

    await queryInterface.addIndex('connected_payment_accounts', ['hotel_id'], {
      name: 'idx_connected_payment_accounts_hotel_id',
    });

    await queryInterface.addIndex(
      'connected_payment_accounts',
      ['provider', 'provider_account_id'],
      {
        name: 'idx_connected_payment_accounts_provider_account_unique',
        unique: true,
      }
    );

    await queryInterface.addIndex(
      'connected_payment_accounts',
      ['payouts_enabled', 'onboarding_status'],
      {
        name: 'idx_connected_payment_accounts_payout_ready',
      }
    );

    await queryInterface.addIndex(
      'connected_payment_accounts',
      ['user_id', 'hotel_id', 'is_default'],
      {
        name: 'idx_connected_payment_accounts_default',
      }
    );

    await queryInterface.sequelize.query(`
      INSERT INTO connected_payment_accounts (
        id,
        user_id,
        provider,
        provider_account_id,
        account_type,
        onboarding_status,
        is_default,
        metadata,
        created_at,
        updated_at
      )
      SELECT
        UUID(),
        id,
        'stripe',
        connect_account_id,
        'express',
        'pending',
        TRUE,
        JSON_OBJECT('source', 'users.connect_account_id'),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM users
      WHERE connect_account_id IS NOT NULL
        AND connect_account_id <> ''
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('connected_payment_accounts');
  },
};
