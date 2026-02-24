const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const UserRole = sequelize.define(
    'user_roles',
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
        comment: 'User this role assignment belongs to',
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Global role assigned to this user',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      tableName: 'user_roles',
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
          name: 'idx_user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
        },
        {
          name: 'idx_role_id',
          using: 'BTREE',
          fields: [{ name: 'role_id' }],
        },
        {
          name: 'idx_user_role_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'user_id' }, { name: 'role_id' }],
          comment: 'A user should not have duplicate assignments of the same global role',
        },
      ],
    }
  );

  UserRole.associate = function (models) {
    UserRole.belongsTo(models.users, {
      foreignKey: 'user_id',
      as: 'user',
    });

    UserRole.belongsTo(models.roles, {
      foreignKey: 'role_id',
      as: 'role',
    });
  };

  return UserRole;
};
