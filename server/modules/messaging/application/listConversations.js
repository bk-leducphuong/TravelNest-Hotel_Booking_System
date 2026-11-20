const { DEFAULT_PAGE_SIZE } = require('../constants');
const { toConversationDto } = require('./serializers');
const conversationRepository = require('../infrastructure/conversation.repository');

function paginate({ page = 1, limit = DEFAULT_PAGE_SIZE }) {
  return { page, limit, offset: (page - 1) * limit };
}

async function listGuestConversations({ userId, page, limit, unreadOnly = false }) {
  const {
    page: safePage,
    limit: safeLimit,
    offset,
  } = paginate({
    page: Number(page) || 1,
    limit: Number(limit) || DEFAULT_PAGE_SIZE,
  });

  const { rows, count } = await conversationRepository.findForGuest(userId, {
    limit: safeLimit,
    offset,
    unreadOnly,
  });

  const unread = await conversationRepository.countUnreadForConversations(
    rows.map((row) => row.id),
    userId,
    'hotel'
  );

  return {
    conversations: rows.map((row) =>
      toConversationDto(row, { unreadCount: unread.get(row.id) || 0 })
    ),
    page: safePage,
    limit: safeLimit,
    total: count,
  };
}

async function listHotelConversations({ hotelId, readerUserId, page, limit, unreadOnly = false }) {
  const {
    page: safePage,
    limit: safeLimit,
    offset,
  } = paginate({
    page: Number(page) || 1,
    limit: Number(limit) || DEFAULT_PAGE_SIZE,
  });

  const { rows, count } = await conversationRepository.findForHotel(hotelId, {
    limit: safeLimit,
    offset,
    unreadOnly,
    readerUserId,
  });

  const unread = await conversationRepository.countUnreadForConversations(
    rows.map((row) => row.id),
    readerUserId,
    'guest'
  );

  return {
    conversations: rows.map((row) =>
      toConversationDto(row, { unreadCount: unread.get(row.id) || 0, includeGuest: true })
    ),
    page: safePage,
    limit: safeLimit,
    total: count,
  };
}

module.exports = { listGuestConversations, listHotelConversations };
