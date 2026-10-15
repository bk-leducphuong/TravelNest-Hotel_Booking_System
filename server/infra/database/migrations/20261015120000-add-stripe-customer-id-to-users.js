'use strict';

const {
  addColumnIfMissing,
  addIndexIfMissing,
  columnExists,
  dropIndexIfExists,
} = require('../migration-utils/schema');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await addColumnIfMissing(queryInterface, 'users', 'stripe_customer_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Stripe customer that owns this user saved payment methods.',
    });

    await addIndexIfMissing(queryInterface, 'users', ['stripe_customer_id'], {
      name: 'stripe_customer_id_UNIQUE',
      unique: true,
    });
  },

  down: async (queryInterface) => {
    await dropIndexIfExists(queryInterface, 'users', 'stripe_customer_id_UNIQUE');

    if (await columnExists(queryInterface, 'users', 'stripe_customer_id')) {
      await queryInterface.removeColumn('users', 'stripe_customer_id');
    }
  },
};
