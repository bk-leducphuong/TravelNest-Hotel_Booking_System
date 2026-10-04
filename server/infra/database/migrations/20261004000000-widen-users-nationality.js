'use strict';

/**
 * Widen `users.nationality` to STRING(255).
 *
 * The column was VARCHAR(30), but the seeder (and `users.country`) store full
 * country names from faker, and the profile-update schema accepts up to 100
 * characters. Country names longer than 30 chars failed to insert during
 * seeding ("Data too long for column 'nationality'"). 255 matches `country`.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('users');
    if (table.nationality && table.nationality.type !== 'VARCHAR(255)') {
      await queryInterface.changeColumn('users', 'nationality', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'nationality', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
  },
};
