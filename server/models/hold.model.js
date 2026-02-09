const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

// If payment is confirmed, the hold is converted to a booking
module.exports = function (sequelize, DataTypes) {
  const Hold = sequelize.define(
    'holds',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      check_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      check_out_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      number_of_guests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of rooms booked',
      },
      total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        comment: 'Hotel for quick lookup',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When the hold expires (e.g. 15 min from creation)',
      },
      status: {
        type: DataTypes.ENUM('active', 'released', 'expired', 'completed'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      released_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'holds',
      timestamps: false,
      paranoid: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_holds_user_status',
          using: 'BTREE',
          fields: [{ name: 'user_id' }, { name: 'status' }],
          comment: 'Find active holds by user',
        },
        {
          name: 'idx_holds_expires_at',
          using: 'BTREE',
          fields: [{ name: 'expires_at' }],
          comment: 'Cleanup expired holds',
        },
      ],
    }
  );

  Hold.associate = function (models) {
    Hold.belongsTo(models.users, {
      foreignKey: 'user_id',
      as: 'user',
    });
    Hold.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    Hold.hasMany(models.hold_rooms, {
      foreignKey: 'hold_id',
      as: 'holdRooms',
    });
  };

  return Hold;
};
