'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('auth_accounts', {
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
        comment: 'User that this authentication method belongs to',
      },
      provider: {
        type: Sequelize.ENUM('local', 'google', 'facebook', 'twitter', 'apple'),
        allowNull: false,
        comment: 'Authentication provider (local or social)',
      },
      provider_user_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Provider-specific user identifier (email for local, sub for OAuth)',
      },
      password_hash: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Password hash for local accounts; null for social logins',
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

    await queryInterface.addIndex('auth_accounts', ['user_id'], {
      name: 'idx_auth_accounts_user_id',
    });

    await queryInterface.addIndex('auth_accounts', ['provider', 'provider_user_id'], {
      name: 'idx_auth_accounts_provider_user_unique',
      unique: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('auth_accounts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_auth_accounts_provider";');
  },
};

