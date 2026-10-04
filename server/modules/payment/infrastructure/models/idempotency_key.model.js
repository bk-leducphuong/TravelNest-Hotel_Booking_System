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
      },
      idempotency_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      request_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      resource_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      response_body: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'processing',
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
