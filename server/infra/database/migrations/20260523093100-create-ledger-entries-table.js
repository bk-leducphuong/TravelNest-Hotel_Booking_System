'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ledger_entries', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      ledger_account_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ledger_accounts',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      entry_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'Shared ID for all debit and credit rows in one accounting event',
      },
      entry_group_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Stable event key used to make ledger posting idempotent',
      },
      direction: {
        type: Sequelize.ENUM('debit', 'credit'),
        allowNull: false,
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
      event_type: {
        type: Sequelize.ENUM(
          'payment_succeeded',
          'refund_succeeded',
          'payout_created',
          'payout_paid',
          'payout_failed',
          'platform_fee_recognized',
          'manual_adjustment'
        ),
        allowNull: false,
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onDelete: 'SET NULL',
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
      },
      payment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'payments',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      refund_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'refunds',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      payout_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'payouts',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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
      },
      buyer_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      provider: {
        type: Sequelize.ENUM('stripe'),
        allowNull: true,
      },
      provider_event_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      provider_balance_transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      idempotency_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      posted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('ledger_entries', ['ledger_account_id'], {
      name: 'idx_ledger_entries_account_id',
    });
    await queryInterface.addIndex('ledger_entries', ['entry_group_id'], {
      name: 'idx_ledger_entries_group_id',
    });
    await queryInterface.addIndex('ledger_entries', ['entry_group_key'], {
      name: 'idx_ledger_entries_group_key',
    });
    await queryInterface.addIndex('ledger_entries', ['idempotency_key'], {
      name: 'idx_ledger_entries_idempotency_key',
      unique: true,
    });
    await queryInterface.addIndex('ledger_entries', ['booking_id', 'transaction_id'], {
      name: 'idx_ledger_entries_refs',
    });
    await queryInterface.addIndex('ledger_entries', ['refund_id'], {
      name: 'idx_ledger_entries_refund_id',
    });
    await queryInterface.addIndex('ledger_entries', ['payout_id'], {
      name: 'idx_ledger_entries_payout_id',
    });
    await queryInterface.addIndex('ledger_entries', ['hotel_id', 'posted_at'], {
      name: 'idx_ledger_entries_hotel_posted',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ledger_entries');
  },
};
