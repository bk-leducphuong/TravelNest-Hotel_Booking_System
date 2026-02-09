const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Role = sequelize.define(
    'roles',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      name: {
        type: DataTypes.ENUM(
          'guest',
          'user',
          'admin',
          'support_agent',
          'owner',
          'manager',
          'staff'
        ),
        allowNull: false,
        unique: true,
        comment:
          'Role identifier. Includes global roles (guest, admin, etc.) and hotel-specific roles (owner, manager, staff).',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human readable description of the role.',
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
      tableName: 'roles',
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
          name: 'unique_role_name',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'name' }],
        },
      ],
    }
  );

  Role.associate = function (models) {
    Role.hasMany(models.user_roles, {
      foreignKey: 'role_id',
      as: 'user_roles',
    });

    Role.hasMany(models.hotel_users, {
      foreignKey: 'role_id',
      as: 'hotel_users',
    });

    Role.belongsToMany(models.permissions, {
      through: models.role_permissions,
      foreignKey: 'role_id',
      otherKey: 'permission_id',
      as: 'permissions',
    });
  };

  return Role;
};
