const logger = require('@config/logger.config');
const { subscribe, DOMAIN_EVENTS } = require('@platform/events');

const { ensureConversationForBooking } = require('../application/ensureConversationForBooking');
const { postSystemMessage } = require('../application/postSystemMessage');

/**
 * Open a thread as soon as a booking exists, and record status transitions as
 * system lines so both sides share a timeline.
 *
 * Subscribers are best-effort: messaging must never break booking. A failure is
 * logged, and the guest path still opens the thread lazily via
 * `POST /api/v1/conversations`.
 */

const STATUS_MESSAGES = {
  confirmed: 'Booking confirmed',
  cancelled: 'Booking cancelled',
  completed: 'Stay completed',
};

let registered = false;

async function openThread(bookingId) {
  if (!bookingId) {
    return null;
  }

  try {
    return await ensureConversationForBooking(bookingId);
  } catch (error) {
    logger.warn({ error: error.message, bookingId }, 'Could not open chat thread for booking');
    return null;
  }
}

async function handleBookingCreated({ bookingId }) {
  await openThread(bookingId);
}

async function handleBookingStatusChanged({ bookingId, to }) {
  const body = STATUS_MESSAGES[to];
  if (!body) {
    return;
  }

  const conversation = await openThread(bookingId);
  if (!conversation) {
    return;
  }

  try {
    await postSystemMessage({ conversationId: conversation.id, body });
  } catch (error) {
    logger.warn({ error: error.message, bookingId }, 'Could not post chat system message');
  }
}

/**
 * Wire messaging subscribers. Safe to call more than once.
 */
function registerMessagingSubscribers() {
  if (registered) {
    return;
  }
  registered = true;

  subscribe(DOMAIN_EVENTS.BOOKING_CREATED, handleBookingCreated);
  subscribe(DOMAIN_EVENTS.BOOKING_STATUS_CHANGED, handleBookingStatusChanged);

  logger.info('Messaging module event subscribers registered');
}

module.exports = { registerMessagingSubscribers };
