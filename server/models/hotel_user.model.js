const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const HotelUser = sequelize.define(
    'hotel_users',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Hotel this user is associated with',
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
        comment: 'User who has a role at this hotel',
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment:
          'Hotel-specific role (owner, manager, or staff) for this user at this hotel',
      },
      is_primary_owner: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment:
          'Marks the main owner for the hotel. Should be true for at most one user per hotel.',
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
      tableName: 'hotel_users',
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
          name: 'idx_hotel_user_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'user_id' }],
          comment:
            'Each user can only have one record per hotel (role scoped by row).',
        },
        {
          name: 'idx_hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
          comment: 'For querying all users of a hotel',
        },
        {
          name: 'idx_user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
          comment: 'For querying all hotels a user is attached to',
        },
        {
          name: 'idx_role_id',
          using: 'BTREE',
          fields: [{ name: 'role_id' }],
          comment: 'Index for filtering by hotel role',
        },
        {
          name: 'idx_primary_owner_per_hotel',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'is_primary_owner' }],
          comment:
            'Helps enforce and query primary owner constraints at application level',
        },
      ],
    }
  );

  HotelUser.associate = function (models) {
    HotelUser.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });

    HotelUser.belongsTo(models.users, {
      foreignKey: 'user_id',
      as: 'user',
    });

    HotelUser.belongsTo(models.roles, {
      foreignKey: 'role_id',
      as: 'role',
    });
  };

  return HotelUser;
};
