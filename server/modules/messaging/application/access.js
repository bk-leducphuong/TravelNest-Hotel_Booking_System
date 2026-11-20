const conversationRepository = require('../infrastructure/conversation.repository');

/**
 * Resolve which side of a thread the caller may act on.
 *
 * Used by the socket layer, where the same physical user can be a guest in one
 * thread and hotel staff in another, and where no hotel-scoped middleware runs.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string[]} [params.hotelIds] hotels the user has a role in
 * @returns {Promise<{ conversation: object, side: 'guest'|'hotel' }|null>}
 */
async function resolveConversationAccess({ conversationId, userId, hotelIds = [] }) {
  if (!conversationId || !userId) {
    return null;
  }

  const conversation = await conversationRepository.findAccessContext(conversationId);
  if (!conversation) {
    return null;
  }

  if (String(conversation.guest_user_id) === String(userId)) {
    return { conversation, side: 'guest' };
  }

  const isHotelMember = hotelIds.some(
    (hotelId) => String(hotelId) === String(conversation.hotel_id)
  );

  if (isHotelMember) {
    return { conversation, side: 'hotel' };
  }

  return null;
}

/**
 * Hotel that owns a thread, for the cross-hotel IDOR guard on owner routes.
 */
async function getConversationHotelId(conversationId) {
  const conversation = await conversationRepository.findAccessContext(conversationId);
  return conversation?.hotel_id;
}

module.exports = { resolveConversationAccess, getConversationHotelId };
