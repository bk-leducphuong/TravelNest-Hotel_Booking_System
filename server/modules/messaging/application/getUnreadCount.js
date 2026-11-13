const conversationRepository = require('../infrastructure/conversation.repository');

/**
 * Badge counts. Only messages from the other side count: own replies and
 * system lines (booking confirmed/cancelled) never need a response.
 */
async function getGuestUnreadCount(userId) {
  const unread = await conversationRepository.countUnreadByScope({
    scope: 'guest',
    scopeValue: userId,
    readerUserId: userId,
    otherSide: 'hotel',
  });

  return { unread };
}

async function getHotelUnreadCount({ hotelId, readerUserId }) {
  const unread = await conversationRepository.countUnreadByScope({
    scope: 'hotel',
    scopeValue: hotelId,
    readerUserId,
    otherSide: 'guest',
  });

  return { unread };
}

module.exports = { getGuestUnreadCount, getHotelUnreadCount };
