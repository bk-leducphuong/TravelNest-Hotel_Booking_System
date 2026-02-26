const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const AuthAccount = sequelize.define(
    'auth_accounts',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      user_id: {
        type: DataTypes.UUID,
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
        type: DataTypes.ENUM('local', 'google', 'facebook', 'twitter', 'apple'),
        allowNull: false,
        comment: 'Authentication provider (local or social)',
      },
      provider_user_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Provider-specific user identifier (email for local, sub for OAuth)',
      },
      password_hash: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Password hash for local accounts; null for social logins',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      tableName: 'auth_accounts',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_auth_accounts_user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
        },
        {
          name: 'idx_auth_accounts_provider_user_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'provider' }, { name: 'provider_user_id' }],
        },
      ],
    }
  );

  AuthAccount.associate = function (models) {
    AuthAccount.belongsTo(models.users, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  return AuthAccount;
};

