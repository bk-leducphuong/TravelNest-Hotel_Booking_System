const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const RolePermission = sequelize.define(
    'role_permissions',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
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
        comment: 'Role this permission is granted to.',
      },
      permission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'permissions',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Permission granted to this role.',
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
      tableName: 'role_permissions',
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
          name: 'idx_role_id',
          using: 'BTREE',
          fields: [{ name: 'role_id' }],
        },
        {
          name: 'idx_permission_id',
          using: 'BTREE',
          fields: [{ name: 'permission_id' }],
        },
        {
          name: 'idx_role_permission_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'role_id' }, { name: 'permission_id' }],
          comment: 'Each role should only have a permission assigned at most once.',
        },
      ],
    }
  );

  RolePermission.associate = function (models) {
    RolePermission.belongsTo(models.permissions, {
      foreignKey: 'permission_id',
      as: 'permission',
    });
    RolePermission.belongsTo(models.roles, {
      foreignKey: 'role_id',
      as: 'role',
    });
  };

  return RolePermission;
};
