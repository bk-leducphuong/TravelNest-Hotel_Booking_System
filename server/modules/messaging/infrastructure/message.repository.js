const { Op, QueryTypes } = require('sequelize');

const { Messages, Users, sequelize } = require('@platform/database');

/**
 * Message Repository - persistence for thread messages.
 */

class MessageRepository {
  async loadWithSender(messageId) {
    return Messages.findByPk(messageId, {
      include: [
        {
          model: Users,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture_url'],
          required: false,
        },
      ],
    });
  }

  async findByIdempotencyKey(conversationId, clientMessageId) {
    if (!clientMessageId) {
      return null;
    }

    return Messages.findOne({
      where: { conversation_id: conversationId, client_message_id: clientMessageId },
    });
  }

  async create(payload, options = {}) {
    return Messages.create(payload, options);
  }

  async findById(messageId, options = {}) {
    return Messages.findByPk(messageId, options);
  }

  /**
   * Newest-first page, then reversed by the caller for display.
   * Fetches one extra row to answer `hasMore` without a count query.
   */
  async listPage({ conversationId, beforeSeq = null, limit = 30 } = {}) {
    const where = { conversation_id: conversationId };
    if (beforeSeq) {
      where.seq = { [Op.lt]: beforeSeq };
    }

    const rows = await Messages.findAll({
      where,
      order: [['seq', 'DESC']],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return { messages: page.reverse(), hasMore };
  }

  async existsSystemMessage(conversationId, body) {
    const row = await Messages.findOne({
      where: { conversation_id: conversationId, type: 'system', body },
      attributes: ['id'],
    });
    return Boolean(row);
  }

  /**
   * Reader-aware unread count for one thread (used when acknowledging a join).
   */
  async countUnreadForReader(conversationId, readerUserId, otherSide) {
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS unread
         FROM messages m
         LEFT JOIN conversation_reads cr
           ON cr.conversation_id = m.conversation_id AND cr.user_id = :readerUserId
        WHERE m.conversation_id = :conversationId
          AND m.sender_side = :otherSide
          AND m.seq > COALESCE(cr.last_read_seq, 0)`,
      {
        replacements: { conversationId, readerUserId, otherSide },
        type: QueryTypes.SELECT,
      }
    );

    return Number(rows[0]?.unread || 0);
  }

  async countAll(conversationId) {
    return Messages.count({ where: { conversation_id: conversationId } });
  }
}

module.exports = new MessageRepository();
