'use strict';

const {
  addIndexIfMissing,
  createTableIfMissing,
} = require('../migration-utils/schema');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await createTableIfMissing(queryInterface, 'hotel_cancellation_rules', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      hotel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      room_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'rooms',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Null means hotel-wide default rule',
      },
      is_refundable: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      free_cancellation_until_hours_before_checkin: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Hours before check-in when full free cancellation ends',
      },
      refund_percent_before_deadline: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 100.0,
      },
      refund_percent_after_deadline: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      cancellation_fee_type: {
        type: Sequelize.ENUM('none', 'percentage'),
        allowNull: false,
        defaultValue: 'none',
      },
      cancellation_fee_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await addIndexIfMissing(queryInterface, 'hotel_cancellation_rules', ['hotel_id'], {
      name: 'idx_hotel_cancellation_rules_hotel_id',
    });
    await addIndexIfMissing(queryInterface, 'hotel_cancellation_rules', ['room_id'], {
      name: 'idx_hotel_cancellation_rules_room_id',
    });
    await addIndexIfMissing(queryInterface, 'hotel_cancellation_rules', ['hotel_id', 'room_id'], {
      name: 'idx_hotel_cancellation_rules_scope_unique',
      unique: true,
    });
    await addIndexIfMissing(queryInterface, 'hotel_cancellation_rules', ['hotel_id', 'is_active'], {
      name: 'idx_hotel_cancellation_rules_active',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('hotel_cancellation_rules');
  },
};
