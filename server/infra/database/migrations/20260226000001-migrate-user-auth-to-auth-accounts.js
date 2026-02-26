'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const users = await queryInterface.sequelize.query(
        'SELECT id, email, password_hash, created_at, updated_at FROM users',
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (users.length > 0) {
        const authAccounts = users
          .filter((user) => user.email && user.password_hash)
          .map((user) => ({
            // For initial migration, reuse user.id as auth_account.id.
            // App code generates new UUIDs for future auth_accounts.
            id: user.id,
            user_id: user.id,
            provider: 'local',
            provider_user_id: user.email,
            password_hash: user.password_hash,
            created_at: user.created_at || new Date(),
            updated_at: user.updated_at || new Date(),
          }));

        if (authAccounts.length > 0) {
          await queryInterface.bulkInsert('auth_accounts', authAccounts, { transaction });
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('auth_accounts', null, {});
  },
};

