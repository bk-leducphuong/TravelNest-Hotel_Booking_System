'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('bookings');

    if (table.room_id && table.room_id.allowNull === false) {
      await queryInterface.changeColumn('bookings', 'room_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'rooms',
          key: 'id',
        },
      });
    }

    const bookingColumns = {
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      service_fee_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      platform_commission_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      guest_details: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      price_breakdown: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      cancellation_policy_snapshot: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      payment_due_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    };

    for (const [columnName, definition] of Object.entries(bookingColumns)) {
      if (!table[columnName]) {
        await queryInterface.addColumn('bookings', columnName, definition);
      }
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE bookings
      MODIFY status ENUM(
        'pending',
        'pending_payment',
        'confirmed',
        'payment_failed',
        'expired',
        'checked_in',
        'completed',
        'cancelled',
        'no_show'
      ) NOT NULL DEFAULT 'pending_payment'
    `);

    const holdTable = await queryInterface.describeTable('holds');
    const holdColumns = {
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      service_fee_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      platform_commission_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      price_breakdown: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      cancellation_policy_snapshot: {
        type: Sequelize.JSON,
        allowNull: true,
      },
    };

    for (const [columnName, definition] of Object.entries(holdColumns)) {
      if (!holdTable[columnName]) {
        await queryInterface.addColumn('holds', columnName, definition);
      }
    }

    await queryInterface.createTable('booking_rooms', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      room_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'rooms',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      nightly_price_snapshot: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('booking_rooms', ['booking_id'], {
      name: 'idx_booking_rooms_booking_id',
    });
    await queryInterface.addIndex('booking_rooms', ['room_id'], {
      name: 'idx_booking_rooms_room_id',
    });

    await queryInterface.createTable('idempotency_keys', {
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
      },
      idempotency_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      request_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'processing',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('idempotency_keys', ['user_id', 'idempotency_key'], {
      name: 'idx_idempotency_keys_user_key',
      unique: true,
    });

    await queryInterface.changeColumn('transactions', 'booking_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'bookings',
        key: 'id',
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('idempotency_keys');
    await queryInterface.dropTable('booking_rooms');

    await queryInterface.changeColumn('transactions', 'booking_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'bookings',
        key: 'id',
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE bookings
      MODIFY status ENUM(
        'pending',
        'confirmed',
        'checked_in',
        'completed',
        'cancelled',
        'no_show'
      ) NOT NULL DEFAULT 'pending'
    `);

    const bookingColumns = [
      'expires_at',
      'cancelled_at',
      'confirmed_at',
      'payment_due_at',
      'cancellation_policy_snapshot',
      'price_breakdown',
      'guest_details',
      'platform_commission_amount',
      'service_fee_amount',
      'tax_amount',
      'subtotal',
    ];
    for (const columnName of bookingColumns) {
      await queryInterface.removeColumn('bookings', columnName);
    }

    const holdColumns = [
      'cancellation_policy_snapshot',
      'price_breakdown',
      'platform_commission_amount',
      'service_fee_amount',
      'tax_amount',
      'subtotal',
    ];
    for (const columnName of holdColumns) {
      await queryInterface.removeColumn('holds', columnName);
    }
  },
};
