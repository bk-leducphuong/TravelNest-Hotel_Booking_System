const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Message = sequelize.define(
    'messages',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      conversation_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      seq: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Per-conversation sequence allocated inside the send transaction',
      },
      sender_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'NULL for system messages',
      },
      sender_side: {
        type: DataTypes.ENUM('guest', 'hotel', 'system'),
        allowNull: false,
        comment: 'Denormalized side so the UI never needs a join to render authorship',
      },
      type: {
        type: DataTypes.ENUM('text', 'system', 'image'),
        allowNull: false,
        defaultValue: 'text',
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      client_message_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Client retry key; unique per conversation',
      },
      flagged: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Off-platform contact sharing detected (URL / phone / email)',
      },
      flag_reason: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP(6)'),
      },
    },
    {
      sequelize,
      tableName: 'messages',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          name: 'messages_conversation_seq_unique',
          unique: true,
          fields: [{ name: 'conversation_id' }, { name: 'seq' }],
        },
        {
          name: 'messages_conversation_client_id_unique',
          unique: true,
          fields: [{ name: 'conversation_id' }, { name: 'client_message_id' }],
        },
      ],
    }
  );

  Message.associate = function (models) {
    Message.belongsTo(models.conversations, { foreignKey: 'conversation_id', as: 'conversation' });
    Message.belongsTo(models.users, { foreignKey: 'sender_user_id', as: 'sender' });
    Message.hasMany(models.message_attachments, {
      foreignKey: 'message_id',
      as: 'attachments',
    });
  };

  return Message;
};
