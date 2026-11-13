const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const MessageAttachment = sequelize.define(
    'message_attachments',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      message_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'messages', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      object_key: {
        type: DataTypes.STRING(512),
        allowNull: false,
        comment: 'MinIO object key; the browser builds the public URL',
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      size_bytes: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      position: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order within the message (0-4)',
      },
      created_at: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP(6)'),
      },
    },
    {
      sequelize,
      tableName: 'message_attachments',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          name: 'message_attachments_message_position_unique',
          unique: true,
          fields: [{ name: 'message_id' }, { name: 'position' }],
        },
        {
          name: 'message_attachments_object_key_unique',
          unique: true,
          fields: [{ name: 'object_key' }],
        },
      ],
    }
  );

  MessageAttachment.associate = function (models) {
    MessageAttachment.belongsTo(models.messages, {
      foreignKey: 'message_id',
      as: 'message',
    });
  };

  return MessageAttachment;
};
