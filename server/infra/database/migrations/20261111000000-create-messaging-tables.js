'use strict';

const { addIndexIfMissing, createTableIfMissing } = require('../migration-utils/schema');

const CONVERSATION_STATUSES = ['open', 'archived'];
const SENDER_SIDES = ['guest', 'hotel', 'system'];
const MESSAGE_TYPES = ['text', 'system'];

/**
 * Guest <-> hotel conversation threads.
 *
 * A conversation is created for a booking (one thread per booking) and is
 * addressed by hotel, not by owner user, so staff turnover does not break the
 * thread. `booking_id` is nullable so hotel-level inquiry threads can reuse the
 * same tables later; MySQL allows multiple NULLs in a unique index.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfMissing(queryInterface, 'conversations', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      hotel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'hotels', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      guest_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      // Per-conversation monotonic counter. Messages are ordered and paged by
      // this value instead of created_at so ties and clock skew cannot reorder.
      last_message_seq: { type: Sequelize.BIGINT, allowNull: false, defaultValue: 0 },
      last_message_at: { type: Sequelize.DATE(6), allowNull: true },
      last_message_preview: { type: Sequelize.STRING(280), allowNull: true },
      status: {
        type: Sequelize.ENUM(...CONVERSATION_STATUSES),
        allowNull: false,
        defaultValue: 'open',
      },
      created_at: { type: Sequelize.DATE(6), allowNull: false },
      updated_at: { type: Sequelize.DATE(6), allowNull: false },
    });

    await addIndexIfMissing(queryInterface, 'conversations', ['booking_id'], {
      name: 'conversations_booking_unique',
      unique: true,
    });
    await addIndexIfMissing(queryInterface, 'conversations', ['hotel_id', 'last_message_at'], {
      name: 'conversations_hotel_last_message',
    });
    await addIndexIfMissing(queryInterface, 'conversations', ['guest_user_id', 'last_message_at'], {
      name: 'conversations_guest_last_message',
    });

    await createTableIfMissing(queryInterface, 'messages', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      seq: { type: Sequelize.BIGINT, allowNull: false },
      sender_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      sender_side: {
        type: Sequelize.ENUM(...SENDER_SIDES),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM(...MESSAGE_TYPES),
        allowNull: false,
        defaultValue: 'text',
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      // Client-generated key so a retried send returns the original message
      // instead of duplicating it.
      client_message_id: { type: Sequelize.UUID, allowNull: true },
      // Off-platform contact sharing (URL / phone / email) is stored and
      // flagged for later review instead of being rejected.
      flagged: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      flag_reason: { type: Sequelize.STRING(32), allowNull: true },
      created_at: { type: Sequelize.DATE(6), allowNull: false },
    });

    await addIndexIfMissing(queryInterface, 'messages', ['conversation_id', 'seq'], {
      name: 'messages_conversation_seq_unique',
      unique: true,
    });
    await addIndexIfMissing(queryInterface, 'messages', ['conversation_id', 'client_message_id'], {
      name: 'messages_conversation_client_id_unique',
      unique: true,
    });

    await createTableIfMissing(queryInterface, 'conversation_reads', {
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'conversations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      last_read_seq: { type: Sequelize.BIGINT, allowNull: false, defaultValue: 0 },
      // Highest sequence already reported to the user (email/socket dedupe).
      last_notified_seq: { type: Sequelize.BIGINT, allowNull: false, defaultValue: 0 },
      muted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await addIndexIfMissing(queryInterface, 'conversation_reads', ['user_id'], {
      name: 'conversation_reads_user',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('conversation_reads');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('conversations');
  },
};
