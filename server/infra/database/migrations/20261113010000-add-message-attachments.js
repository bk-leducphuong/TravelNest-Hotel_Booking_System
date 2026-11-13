'use strict';

const { addIndexIfMissing, createTableIfMissing } = require('../migration-utils/schema');

const MESSAGE_TYPES = ['text', 'system', 'image'];

/**
 * Image attachments for chat messages.
 *
 * Files are uploaded first (to MinIO) and then claimed by a message through its
 * `attachmentKeys`; the unique `object_key` index makes a key single-use.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('messages', 'type', {
      type: Sequelize.ENUM(...MESSAGE_TYPES),
      allowNull: false,
      defaultValue: 'text',
    });

    await createTableIfMissing(queryInterface, 'message_attachments', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      message_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'messages', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      object_key: {
        type: Sequelize.STRING(512),
        allowNull: false,
        comment: 'MinIO object key; the browser builds the public URL',
      },
      mime_type: { type: Sequelize.STRING(100), allowNull: false },
      size_bytes: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      position: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order within the message (0-4)',
      },
      created_at: { type: Sequelize.DATE(6), allowNull: false },
    });

    await addIndexIfMissing(queryInterface, 'message_attachments', ['message_id', 'position'], {
      name: 'message_attachments_message_position_unique',
      unique: true,
    });
    await addIndexIfMissing(queryInterface, 'message_attachments', ['object_key'], {
      name: 'message_attachments_object_key_unique',
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('message_attachments');

    // Keep the message rows (an image-only message becomes an empty text row)
    // so the enum can be narrowed without a destructive delete.
    await queryInterface.sequelize.query("UPDATE messages SET type = 'text' WHERE type = 'image'");
    await queryInterface.changeColumn('messages', 'type', {
      type: Sequelize.ENUM('text', 'system'),
      allowNull: false,
      defaultValue: 'text',
    });
  },
};
