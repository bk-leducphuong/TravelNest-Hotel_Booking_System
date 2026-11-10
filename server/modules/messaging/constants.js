const MAX_BODY_LENGTH = 4000;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MESSAGE_PAGE_SIZE = 30;

/**
 * How long after check-out a guest may still post in the thread. Reading history
 * is always allowed; only sending is time-boxed. Hotels can always reply.
 */
function sendWindowDays() {
  const parsed = Number(process.env.CHAT_SEND_WINDOW_DAYS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30;
}

module.exports = {
  MAX_BODY_LENGTH,
  DEFAULT_PAGE_SIZE,
  DEFAULT_MESSAGE_PAGE_SIZE,
  sendWindowDays,
};
