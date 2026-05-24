const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Booking = sequelize.define(
    'bookings',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      buyer_id: {
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
      },
      room_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'rooms',
          key: 'id',
        },
        comment: 'Legacy primary room pointer. New bookings use booking_rooms.',
      },
      hold_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'holds',
          key: 'id',
        },
        comment: 'Hold ID for temporary locking',
      },
      booking_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
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
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      service_fee_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      platform_commission_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'pending_payment',
          'confirmed',
          'payment_failed',
          'expired',
          'checked_in',
          'completed',
          'cancelled',
          'no_show'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      special_requests: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      guest_details: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      price_breakdown: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      cancellation_policy_snapshot: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      payment_due_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
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
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'bookings',
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
          name: 'booking_code_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'booking_code' }],
        },
        {
          name: 'buyer_id',
          using: 'BTREE',
          fields: [{ name: 'buyer_id' }],
        },
        {
          name: 'hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
        {
          name: 'room_id',
          using: 'BTREE',
          fields: [{ name: 'room_id' }],
        },
        {
          name: 'status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
        },
        {
          name: 'check_in_date',
          using: 'BTREE',
          fields: [{ name: 'check_in_date' }],
        },
      ],
    }
  );

  Booking.associate = function (models) {
    Booking.belongsTo(models.users, {
      foreignKey: 'buyer_id',
      as: 'buyer',
    });
    Booking.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    Booking.belongsTo(models.rooms, {
      foreignKey: 'room_id',
      as: 'room',
    });
    Booking.hasMany(models.reviews, {
      foreignKey: 'booking_id',
      as: 'reviews',
    });
    Booking.hasOne(models.transactions, {
      foreignKey: 'booking_id',
      as: 'transaction',
    });
    Booking.hasMany(models.booking_rooms, {
      foreignKey: 'booking_id',
      as: 'bookingRooms',
    });
    Booking.hasOne(models.holds, {
      foreignKey: 'booking_id',
      as: 'hold',
    });
    Booking.hasMany(models.refunds, {
      foreignKey: 'booking_id',
      as: 'refunds',
    });
    Booking.hasMany(models.ledger_entries, {
      foreignKey: 'booking_id',
      as: 'ledger_entries',
    });
    Booking.hasOne(models.payout_items, {
      foreignKey: 'booking_id',
      as: 'payout_item',
    });
  };

  return Booking;
};
