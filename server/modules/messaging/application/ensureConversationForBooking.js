const ApiError = require('@utils/ApiError');

const bookingModule = require('@modules/booking');

const conversationRepository = require('../infrastructure/conversation.repository');

// A booking that expired before payment never became a real stay. Everything
// else - including cancelled and completed stays - may have a thread, because
// guests legitimately need to follow up after a cancellation.
const BLOCKED_STATUSES = new Set(['expired']);

/**
 * Idempotently open the thread for a booking.
 *
 * This is the only way a conversation is created. Running it from the booking
 * event subscriber and from the guest's "open chat" call means the thread
 * exists regardless of which side gets there first.
 *
 * @param {string} bookingId
 * @returns {Promise<object>} conversation model instance
 */
async function ensureConversationForBooking(bookingId) {
  if (!bookingId) {
    throw new ApiError(400, 'BOOKING_ID_REQUIRED', 'bookingId is required.');
  }

  const existing = await conversationRepository.findByBookingId(bookingId);
  if (existing) {
    return existing;
  }

  const booking = await bookingModule.getBookingForPayment(bookingId);
  if (!booking) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
  }

  if (BLOCKED_STATUSES.has(booking.status)) {
    throw new ApiError(
      409,
      'CONVERSATION_NOT_ALLOWED',
      'This booking is no longer eligible for a conversation.'
    );
  }

  try {
    return await conversationRepository.create({
      hotel_id: booking.hotel_id,
      booking_id: booking.id,
      guest_user_id: booking.buyer_id,
    });
  } catch (error) {
    // Two callers (event subscriber + guest opening the page) can race. The
    // unique index on booking_id decides the winner; the loser reads it back.
    if (error.name === 'SequelizeUniqueConstraintError') {
      const raced = await conversationRepository.findByBookingId(bookingId);
      if (raced) {
        return raced;
      }
    }
    throw error;
  }
}

/**
 * Guest entry point: open the thread for one of *this guest's* bookings.
 *
 * Ownership is checked before creating anything, so another user's booking id
 * cannot be used to create threads or probe which bookings exist.
 */
async function openConversationForGuest({ userId, bookingId }) {
  if (!bookingId) {
    throw new ApiError(400, 'BOOKING_ID_REQUIRED', 'bookingId is required.');
  }

  const existing = await conversationRepository.findByBookingId(bookingId);
  if (existing) {
    if (String(existing.guest_user_id) !== String(userId)) {
      throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
    }
    return detailOr(existing);
  }

  const booking = await bookingModule.getBookingForPayment(bookingId);
  if (!booking || String(booking.buyer_id) !== String(userId)) {
    // Same response for "no such booking" and "someone else's booking".
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
  }

  return detailOr(await ensureConversationForBooking(bookingId));
}

/**
 * Return the inbox-shaped row so the client can render the thread header
 * immediately, falling back to the bare row if the detail query fails.
 */
async function detailOr(conversation) {
  const detail = await conversationRepository.findDetailById(conversation.id);
  return detail || conversation;
}

module.exports = { ensureConversationForBooking, openConversationForGuest };
