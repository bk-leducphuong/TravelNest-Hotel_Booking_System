'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'keycloak_user_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
      comment: 'Stable Keycloak subject identifier mapped to this local application user.',
    });

    await queryInterface.addIndex('users', ['keycloak_user_id'], {
      name: 'keycloak_user_id_UNIQUE',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'keycloak_user_id_UNIQUE');
    await queryInterface.removeColumn('users', 'keycloak_user_id');
  },
};
