const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const IdempotencyKey = sequelize.define(
    'idempotency_keys',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
        comment: 'Primary key (UUID v7).',
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
        comment: 'User who owns the idempotent request.',
      },
      idempotency_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Client-supplied key identifying the request.',
      },
      request_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'Hash of the request payload used to detect key reuse with a different body.',
      },
      resource_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Type of resource created by the request.',
      },
      resource_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID of the resource created by the request.',
      },
      response_body: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Cached response replayed for repeated requests.',
      },
      status: {
        type: DataTypes.ENUM('processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'processing',
        comment: 'Processing state of the idempotent request.',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp after which the key can be purged.',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Row creation timestamp.',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Row last update timestamp.',
      },
    },
    {
      sequelize,
      tableName: 'idempotency_keys',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_idempotency_keys_user_key',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'user_id' }, { name: 'idempotency_key' }],
        },
      ],
    }
  );

  return IdempotencyKey;
};
