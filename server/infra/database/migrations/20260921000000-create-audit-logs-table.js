'use strict';

const { addIndexIfMissing, createTableIfMissing } = require('../migration-utils/schema');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await createTableIfMissing(queryInterface, 'audit_logs', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      actor_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      actor_type: {
        type: Sequelize.ENUM('user', 'system', 'api_token'),
        allowNull: false,
        defaultValue: 'user',
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      hotel_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'hotels', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      before: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      after: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      request_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await addIndexIfMissing(queryInterface, 'audit_logs', ['actor_user_id'], {
      name: 'idx_audit_logs_actor_user_id',
    });
    await addIndexIfMissing(queryInterface, 'audit_logs', ['entity_type', 'entity_id'], {
      name: 'idx_audit_logs_entity',
    });
    await addIndexIfMissing(queryInterface, 'audit_logs', ['hotel_id'], {
      name: 'idx_audit_logs_hotel_id',
    });
    await addIndexIfMissing(queryInterface, 'audit_logs', ['action'], {
      name: 'idx_audit_logs_action',
    });
    await addIndexIfMissing(queryInterface, 'audit_logs', ['created_at'], {
      name: 'idx_audit_logs_created_at',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('audit_logs');
  },
};
