'use strict';
const {
  addColumnIfMissing,
  addIndexIfMissing,
  createTableIfMissing,
} = require('../migration-utils/schema');

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfMissing(queryInterface, 'bookings', 'cancellation_quote', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'bookings', 'cancellation_decision', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    const columns = {
      idempotency_key: { type: Sequelize.STRING(255), allowNull: true },
      workflow_state: { type: Sequelize.STRING(32), allowNull: true },
      attempt_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      first_attempt_at: { type: Sequelize.DATE, allowNull: true },
      next_retry_at: { type: Sequelize.DATE, allowNull: true },
      lease_until: { type: Sequelize.DATE, allowNull: true },
      lease_token: { type: Sequelize.UUID, allowNull: true },
    };
    for (const [name, definition] of Object.entries(columns))
      await addColumnIfMissing(queryInterface, 'refunds', name, definition);
    await addIndexIfMissing(queryInterface, 'refunds', ['idempotency_key'], {
      unique: true,
      name: 'refund_operation_unique',
    });
    await addIndexIfMissing(queryInterface, 'refunds', ['status', 'next_retry_at'], {
      name: 'refund_recovery_due',
    });
    await createTableIfMissing(queryInterface, 'payment_outbox', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      event_key: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      event_type: { type: Sequelize.STRING(100), allowNull: false },
      payload: { type: Sequelize.JSON, allowNull: false },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await addIndexIfMissing(queryInterface, 'payment_outbox', ['delivered_at', 'created_at'], {
      name: 'payment_outbox_delivery_due',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('payment_outbox');
    await queryInterface.removeIndex('refunds', 'refund_operation_unique');
    await queryInterface.removeIndex('refunds', 'refund_recovery_due');
    for (const name of [
      'idempotency_key',
      'workflow_state',
      'attempt_count',
      'first_attempt_at',
      'next_retry_at',
      'lease_until',
      'lease_token',
    ])
      await queryInterface.removeColumn('refunds', name);
    await queryInterface.removeColumn('bookings', 'cancellation_decision');
    await queryInterface.removeColumn('bookings', 'cancellation_quote');
  },
};
