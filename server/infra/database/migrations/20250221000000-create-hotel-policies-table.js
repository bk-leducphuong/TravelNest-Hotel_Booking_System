'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('hotel_policies', {
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
        comment: 'Hotel this policy belongs to',
      },
      policy_type: {
        type: Sequelize.ENUM(
          'cancellation',
          'children',
          'pets',
          'payment',
          'smoking',
          'damage',
          'age_restriction',
          'internet',
          'parking',
          'breakfast',
          'group_booking',
          'additional_fees',
          'other'
        ),
        allowNull: false,
        comment: 'Type of policy (cancellation, children, pets, etc.)',
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Policy title (e.g., "Cancellation Policy")',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Detailed policy description',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this policy is currently active',
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order in which policies should be displayed',
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Icon identifier for UI display',
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

    // Add indexes
    await queryInterface.addIndex('hotel_policies', ['hotel_id'], {
      name: 'idx_hotel_id',
      comment: 'Index for fetching policies by hotel',
    });

    await queryInterface.addIndex('hotel_policies', ['hotel_id', 'policy_type'], {
      name: 'idx_hotel_policy_type',
      comment: 'Composite index for finding specific policy types',
    });

    await queryInterface.addIndex(
      'hotel_policies',
      ['hotel_id', 'is_active', 'display_order'],
      {
        name: 'idx_hotel_active_order',
        comment: 'Index for fetching active policies in display order',
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('hotel_policies');
  },
};
