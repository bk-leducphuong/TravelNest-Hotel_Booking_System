const conversationRepository = require('../infrastructure/conversation.repository');

/**
 * Badge counts. Own-side messages are excluded so an agent's own reply never
 * shows up as something they need to read.
 */
async function getGuestUnreadCount(userId) {
  const unread = await conversationRepository.countUnreadByScope({
    scope: 'guest',
    scopeValue: userId,
    readerUserId: userId,
    ownSide: 'guest',
  });

  return { unread };
}

async function getHotelUnreadCount({ hotelId, readerUserId }) {
  const unread = await conversationRepository.countUnreadByScope({
    scope: 'hotel',
    scopeValue: hotelId,
    readerUserId,
    ownSide: 'hotel',
  });

  return { unread };
}

module.exports = { getGuestUnreadCount, getHotelUnreadCount };
