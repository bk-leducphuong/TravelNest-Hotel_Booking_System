'use strict';

const {
  addColumnIfMissing,
  addIndexIfMissing,
  columnExists,
  dropIndexIfExists,
} = require('../migration-utils/schema');

/**
 * Guest-side inbox deletion.
 *
 * A guest can hide a conversation from their inbox without destroying the
 * thread: the hotel keeps its history and the guest can reopen it from the
 * booking. `guest_deleted_at` is the soft-delete marker the inbox and unread
 * badge queries filter on.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfMissing(queryInterface, 'conversations', 'guest_deleted_at', {
      type: Sequelize.DATE(6),
      allowNull: true,
      comment: 'Set when the guest deletes the thread from their inbox',
    });

    await addIndexIfMissing(
      queryInterface,
      'conversations',
      ['guest_user_id', 'guest_deleted_at'],
      {
        name: 'conversations_guest_deleted',
      }
    );
  },

  async down(queryInterface) {
    await dropIndexIfExists(queryInterface, 'conversations', 'conversations_guest_deleted');
    if (await columnExists(queryInterface, 'conversations', 'guest_deleted_at')) {
      await queryInterface.removeColumn('conversations', 'guest_deleted_at');
    }
  },
};
