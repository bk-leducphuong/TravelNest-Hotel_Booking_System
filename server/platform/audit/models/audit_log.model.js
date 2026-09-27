const { uuidv7 } = require('uuidv7');

/**
 * Audit Log
 *
 * Append-only record of sensitive operations performed by staff/admin actors
 * (refunds, moderation, manual overrides, inventory/price edits, ...).
 *
 * Owned by the platform layer so every module can record into one trail.
 */
module.exports = function (sequelize, DataTypes) {
  const AuditLog = sequelize.define(
    'audit_logs',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      actor_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'User who performed the action (null for system actions)',
      },
      actor_type: {
        type: DataTypes.ENUM('user', 'system', 'api_token'),
        allowNull: false,
        defaultValue: 'user',
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Machine-readable action, e.g. review.status_changed',
      },
      entity_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Affected entity type, e.g. review, booking, payout',
      },
      entity_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'Affected entity identifier',
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'hotels', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Hotel context for hotel-scoped actions',
      },
      before: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      after: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      request_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'audit_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        { name: 'PRIMARY', unique: true, using: 'BTREE', fields: [{ name: 'id' }] },
        {
          name: 'idx_audit_logs_actor_user_id',
          using: 'BTREE',
          fields: [{ name: 'actor_user_id' }],
        },
        {
          name: 'idx_audit_logs_entity',
          using: 'BTREE',
          fields: [{ name: 'entity_type' }, { name: 'entity_id' }],
        },
        { name: 'idx_audit_logs_hotel_id', using: 'BTREE', fields: [{ name: 'hotel_id' }] },
        { name: 'idx_audit_logs_action', using: 'BTREE', fields: [{ name: 'action' }] },
        { name: 'idx_audit_logs_created_at', using: 'BTREE', fields: [{ name: 'created_at' }] },
      ],
    }
  );

  AuditLog.associate = function (models) {
    AuditLog.belongsTo(models.users, { foreignKey: 'actor_user_id', as: 'actor' });
    AuditLog.belongsTo(models.hotels, { foreignKey: 'hotel_id', as: 'hotel' });
  };

  return AuditLog;
};
