const { QueryTypes } = require('sequelize');

const { ConversationReads, sequelize } = require('@platform/database');

/**
 * Read-state Repository - per-reader cursors for unread badges and receipts.
 *
 * Cursors only ever move forward (`GREATEST`), so an out-of-order or replayed
 * acknowledgement cannot resurrect already-read messages.
 */

class ReadStateRepository {
  async findOne(conversationId, userId) {
    return ConversationReads.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });
  }

  async upsertRead({ conversationId, userId, lastSeq }) {
    await sequelize.query(
      `INSERT INTO conversation_reads
         (conversation_id, user_id, last_read_seq, last_notified_seq, created_at, updated_at)
       VALUES (:conversationId, :userId, :lastSeq, 0, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         last_read_seq = GREATEST(last_read_seq, :lastSeq),
         updated_at = NOW()`,
      { replacements: { conversationId, userId, lastSeq } }
    );

    return this.findOne(conversationId, userId);
  }

  async markNotified({ conversationId, userId, seq }) {
    await sequelize.query(
      `INSERT INTO conversation_reads
         (conversation_id, user_id, last_read_seq, last_notified_seq, created_at, updated_at)
       VALUES (:conversationId, :userId, 0, :seq, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         last_notified_seq = GREATEST(last_notified_seq, :seq),
         updated_at = NOW()`,
      { replacements: { conversationId, userId, seq } }
    );
  }

  /**
   * Readers above a sequence for a thread - the fanout targets for a new
   * message that should raise an unread badge.
   */
  async findReadersBelow(conversationId, seq) {
    const rows = await sequelize.query(
      `SELECT user_id AS userId, last_notified_seq AS lastNotifiedSeq
         FROM conversation_reads
        WHERE conversation_id = :conversationId`,
      { replacements: { conversationId }, type: QueryTypes.SELECT }
    );

    return rows.filter((row) => Number(row.lastNotifiedSeq) < Number(seq));
  }
}

module.exports = new ReadStateRepository();
