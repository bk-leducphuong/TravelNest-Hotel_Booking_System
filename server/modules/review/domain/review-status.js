const ApiError = require('@utils/ApiError');

/**
 * Review moderation state machine.
 *
 * Post-moderation policy: a new review is published immediately and moderators
 * can hide or delete it. `deleted` is terminal (soft delete; the row is kept).
 */
const REVIEW_STATUS = {
  PUBLISHED: 'published',
  HIDDEN: 'hidden',
  DELETED: 'deleted',
};

const REVIEW_STATUS_VALUES = Object.values(REVIEW_STATUS);

const ALLOWED_TRANSITIONS = {
  [REVIEW_STATUS.PUBLISHED]: [REVIEW_STATUS.HIDDEN, REVIEW_STATUS.DELETED],
  [REVIEW_STATUS.HIDDEN]: [REVIEW_STATUS.PUBLISHED, REVIEW_STATUS.DELETED],
  [REVIEW_STATUS.DELETED]: [],
};

function canTransition(from, to) {
  if (!REVIEW_STATUS_VALUES.includes(from) || !REVIEW_STATUS_VALUES.includes(to)) {
    return false;
  }
  if (from === to) {
    return false;
  }
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new ApiError(
      409,
      'INVALID_REVIEW_STATUS_TRANSITION',
      `Cannot change review status from '${from}' to '${to}'`
    );
  }
}

module.exports = {
  REVIEW_STATUS,
  REVIEW_STATUS_VALUES,
  canTransition,
  assertTransition,
};
