'use strict';

const { addIndexIfMissing, createTableIfMissing } = require('../migration-utils/schema');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await createTableIfMissing(queryInterface, 'saved_payment_methods', {
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
      },
      stripe_customer_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Stripe customer the payment method is attached to.',
      },
      stripe_payment_method_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Stripe PaymentMethod ID (pm_xxx).',
      },
      brand: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Card brand, e.g. visa, mastercard, amex.',
      },
      last4: {
        type: Sequelize.STRING(4),
        allowNull: true,
      },
      exp_month: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      exp_year: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      cardholder_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Mirror of the Stripe customer default; single default enforced in app code.',
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

    await addIndexIfMissing(queryInterface, 'saved_payment_methods', ['stripe_payment_method_id'], {
      name: 'saved_payment_methods_pm_id_UNIQUE',
      unique: true,
    });

    await addIndexIfMissing(queryInterface, 'saved_payment_methods', ['user_id'], {
      name: 'idx_saved_payment_methods_user_id',
    });

    await addIndexIfMissing(queryInterface, 'saved_payment_methods', ['user_id', 'is_default'], {
      name: 'idx_saved_payment_methods_user_default',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('saved_payment_methods');
  },
};
