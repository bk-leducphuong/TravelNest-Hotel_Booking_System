const { Op, QueryTypes } = require('sequelize');

const { Bookings, Conversations, Hotels, Users, sequelize } = require('@platform/database');

/**
 * Conversation Repository - all persistence for conversation threads.
 *
 * Only this module's repositories import its models. Sequencing writes happen
 * through `findByIdForUpdate` so `messages.seq` can never collide.
 */

const LIST_ATTRIBUTES = [
  'id',
  'hotel_id',
  'booking_id',
  'guest_user_id',
  'last_message_seq',
  'last_message_at',
  'last_message_preview',
  'status',
  'created_at',
  'updated_at',
];

const LIST_INCLUDE = [
  {
    model: Hotels,
    as: 'hotel',
    attributes: ['id', 'name'],
    required: false,
  },
  {
    model: Bookings,
    as: 'booking',
    attributes: ['id', 'booking_code', 'check_in_date', 'check_out_date', 'status'],
    required: false,
  },
  {
    model: Users,
    as: 'guest',
    attributes: ['id', 'first_name', 'last_name', 'profile_picture_url'],
    required: false,
  },
];

class ConversationRepository {
  /**
   * Load the fields needed to authorize access to a thread.
   */
  async findAccessContext(conversationId) {
    return Conversations.findByPk(conversationId, {
      attributes: ['id', 'hotel_id', 'booking_id', 'guest_user_id', 'status', 'last_message_seq'],
      include: [
        {
          model: Bookings,
          as: 'booking',
          attributes: ['id', 'booking_code', 'check_out_date', 'status'],
          required: false,
        },
      ],
    });
  }

  async findById(conversationId, options = {}) {
    return Conversations.findByPk(conversationId, options);
  }

  async findByBookingId(bookingId, options = {}) {
    return Conversations.findOne({ where: { booking_id: bookingId }, ...options });
  }

  /**
   * Full inbox-shaped view of a single thread (hotel, booking, guest).
   */
  async findDetailById(conversationId) {
    return Conversations.findByPk(conversationId, {
      attributes: LIST_ATTRIBUTES,
      include: LIST_INCLUDE,
    });
  }

  async create(payload, options = {}) {
    return Conversations.create(payload, options);
  }

  /**
   * Lock the thread row so the next sequence number can be allocated safely.
   */
  async findByIdForUpdate(conversationId, transaction) {
    return Conversations.findByPk(conversationId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  async updateLastMessage(conversationId, { seq, preview, at }, options = {}) {
    return Conversations.update(
      {
        last_message_seq: seq,
        last_message_preview: preview,
        last_message_at: at,
      },
      { where: { id: conversationId }, ...options }
    );
  }

  /**
   * Inbox for a guest: every thread they participate in, newest activity first.
   */
  async findForGuest(guestUserId, { limit, offset, unreadOnly = false } = {}) {
    const where = { guest_user_id: guestUserId };
    if (unreadOnly) {
      where[Op.and] = [buildUnreadLiteral(guestUserId)];
    }

    return Conversations.findAndCountAll({
      where,
      attributes: LIST_ATTRIBUTES,
      include: LIST_INCLUDE,
      order: [
        ['last_message_at', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit,
      offset,
      distinct: true,
    });
  }

  /**
   * Inbox for a hotel: every thread addressed to it, newest activity first.
   */
  async findForHotel(hotelId, { limit, offset, unreadOnly = false, readerUserId } = {}) {
    const where = { hotel_id: hotelId };
    if (unreadOnly) {
      where[Op.and] = [buildUnreadLiteral(readerUserId)];
    }

    return Conversations.findAndCountAll({
      where,
      attributes: LIST_ATTRIBUTES,
      include: LIST_INCLUDE,
      order: [
        ['last_message_at', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit,
      offset,
      distinct: true,
    });
  }

  /**
   * Unread message count per conversation for one reader, as a Map.
   * Kept as one grouped query so an inbox page costs two queries, not N.
   */
  async countUnreadForConversations(conversationIds, readerUserId) {
    if (!conversationIds.length) {
      return new Map();
    }

    const rows = await sequelize.query(
      `SELECT m.conversation_id AS conversationId, COUNT(*) AS unread
         FROM messages m
         LEFT JOIN conversation_reads cr
           ON cr.conversation_id = m.conversation_id AND cr.user_id = :readerUserId
        WHERE m.conversation_id IN (:conversationIds)
          AND m.seq > COALESCE(cr.last_read_seq, 0)
        GROUP BY m.conversation_id`,
      {
        replacements: { conversationIds, readerUserId },
        type: QueryTypes.SELECT,
      }
    );

    return new Map(rows.map((row) => [row.conversationId, Number(row.unread)]));
  }

  /**
   * Total unread messages for a reader across their scope.
   * `ownSide` is excluded so a reader never sees their own message as unread.
   */
  async countUnreadByScope({ scope, scopeValue, readerUserId, ownSide }) {
    const scopeColumn = scope === 'guest' ? 'c.guest_user_id' : 'c.hotel_id';

    const rows = await sequelize.query(
      `SELECT COUNT(*) AS unread
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         LEFT JOIN conversation_reads cr
           ON cr.conversation_id = c.id AND cr.user_id = :readerUserId
        WHERE ${scopeColumn} = :scopeValue
          AND m.sender_side <> :ownSide
          AND m.seq > COALESCE(cr.last_read_seq, 0)`,
      {
        replacements: { readerUserId, scopeValue, ownSide },
        type: QueryTypes.SELECT,
      }
    );

    return Number(rows[0]?.unread || 0);
  }
}

/**
 * `last_message_seq > last_read_seq` as a portable SQL predicate. The reader id
 * comes from the authenticated request, and is escaped rather than inlined.
 */
function buildUnreadLiteral(readerUserId) {
  const reader = sequelize.escape(readerUserId);
  return sequelize.literal(
    `conversations.last_message_seq > COALESCE((SELECT cr.last_read_seq
       FROM conversation_reads cr
      WHERE cr.conversation_id = conversations.id
        AND cr.user_id = ${reader}), 0)`
  );
}

module.exports = new ConversationRepository();
