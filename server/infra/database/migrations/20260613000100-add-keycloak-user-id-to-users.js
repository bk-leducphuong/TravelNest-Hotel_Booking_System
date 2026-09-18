'use strict';

const {
  addColumnIfMissing,
  addIndexIfMissing,
} = require('../migration-utils/schema');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotent: sequelize.sync() already creates this column from the model,
    // so a fresh database (db-init -> migrate) must not re-add it.
    await addColumnIfMissing(queryInterface, 'users', 'keycloak_user_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
      comment: 'Stable Keycloak subject identifier mapped to this local application user.',
    });

    await addIndexIfMissing(queryInterface, 'users', ['keycloak_user_id'], {
      name: 'keycloak_user_id_UNIQUE',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'keycloak_user_id_UNIQUE');
    await queryInterface.removeColumn('users', 'keycloak_user_id');
  },
};
