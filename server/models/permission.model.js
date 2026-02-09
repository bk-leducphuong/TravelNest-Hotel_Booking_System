const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Permission = sequelize.define(
    'permissions',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          is: {
            args: /^[a-z_]+(\.[a-z_]+)+$/,
            msg: 'Permission name must follow pattern: resource.action (e.g., "hotel.read", "hotel.manage_staff"). Use lowercase letters and underscores only.',
          },
          len: {
            args: [3, 100],
            msg: 'Permission name must be between 3 and 100 characters.',
          },
        },
        comment:
          'Machine-readable permission key following pattern resource.action (e.g., "hotel.read", "hotel.manage_staff", "user.manage.roles").',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable description of what this permission allows.',
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
      tableName: 'permissions',
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
          name: 'unique_permission_name',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'name' }],
        },
      ],
    }
  );

  Permission.associate = function (models) {
    Permission.belongsToMany(models.roles, {
      through: models.role_permissions,
      foreignKey: 'permission_id',
      otherKey: 'role_id',
      as: 'roles',
    });
  };

  return Permission;
};
