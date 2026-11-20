/**
 * Off-platform contact detection.
 *
 * Travel fraud mostly starts with moving the conversation (and the payment) off
 * the platform. We do not reject these messages - guests legitimately share a
 * phone number for arrival coordination - but they are stored with `flagged`
 * so support can review a thread later.
 */

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_CANDIDATE_PATTERN = /\+?\d[\d\s().-]{6,}\d/g;

/**
 * A phone number is 9-15 digits. This deliberately ignores shorter digit runs
 * (dates, prices, booking codes) to keep false positives low.
 */
function looksLikePhone(candidate) {
  const digits = candidate.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

/**
 * @param {string} body
 * @returns {{ flagged: boolean, reason: 'url'|'email'|'phone'|null }}
 */
function inspectMessage(body) {
  const text = String(body || '');

  if (URL_PATTERN.test(text)) {
    return { flagged: true, reason: 'url' };
  }

  if (EMAIL_PATTERN.test(text)) {
    return { flagged: true, reason: 'email' };
  }

  const candidates = text.match(PHONE_CANDIDATE_PATTERN) || [];
  if (candidates.some(looksLikePhone)) {
    return { flagged: true, reason: 'phone' };
  }

  return { flagged: false, reason: null };
}

module.exports = { inspectMessage, looksLikePhone };
