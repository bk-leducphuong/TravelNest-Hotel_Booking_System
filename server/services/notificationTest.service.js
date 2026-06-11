const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const logger = require('@config/logger.config');
const { VALID_ROLES } = require('@constants/roles');
const ApiError = require('@utils/ApiError');
const notificationPublisher = require('@events/notification.publisher');
const emailPublisher = require('@events/email.publisher');
const { Users, UserRoles, Roles } = require('@models/index.js');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const PREVIEW_SAMPLE_SIZE = 10;

function normalizePriority(value) {
  switch (String(value || '').trim().toLowerCase()) {
    case 'low':
      return 'low';
    case 'high':
      return 'high';
    case 'urgent':
      return 'urgent';
    case 'medium':
    case 'normal':
    case '':
      return 'normal';
    default:
      throw new ApiError(
        400,
        'INVALID_NOTIFICATION_TEST_PRIORITY',
        'priority must be one of: low, normal, high, urgent'
      );
  }
}

function normalizeLimit(value, fallback = DEFAULT_LIMIT) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, 'INVALID_NOTIFICATION_TEST_LIMIT', 'limit must be a positive integer');
  }

  return Math.min(parsed, MAX_LIMIT);
}

function normalizeUserIDs(value) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function buildRecipientFilters(filters = {}, { requireEmail = false } = {}) {
  const userIDs = normalizeUserIDs(filters.userIds);
  const role = filters.role ? String(filters.role).trim() : '';
  const limit = normalizeLimit(filters.limit);

  if (userIDs.length === 0 && role === '') {
    throw new ApiError(
      400,
      'NOTIFICATION_TEST_TARGET_REQUIRED',
      'At least one target selector is required: userIds or role'
    );
  }

  if (role && !VALID_ROLES.includes(role)) {
    throw new ApiError(400, 'INVALID_NOTIFICATION_TEST_ROLE', 'role is not supported', {
      allowedValues: VALID_ROLES,
    });
  }

  const where = { status: 'active' };
  if (userIDs.length > 0) {
    where.id = { [Op.in]: userIDs };
  }
  if (requireEmail) {
    where.email = { [Op.ne]: null };
  }

  return { where, userIDs, role, limit };
}

async function loadRecipients(filters = {}, options = {}) {
  const { where, userIDs, role, limit } = buildRecipientFilters(filters, options);
  const include = [];

  if (role) {
    include.push({
      model: UserRoles,
      as: 'roles',
      required: true,
      attributes: [],
      include: [
        {
          model: Roles,
          as: 'role',
          required: true,
          attributes: [],
          where: { name: role },
        },
      ],
    });
  }

  const users = await Users.findAll({
    where,
    include,
    attributes: ['id', 'email', 'first_name', 'last_name'],
    order: [['created_at', 'DESC']],
    limit,
    subQuery: false,
  });

  const dedupedUsers = [];
  const seen = new Set();
  for (const user of users) {
    if (!seen.has(user.id)) {
      seen.add(user.id);
      dedupedUsers.push(user);
    }
  }

  if (userIDs.length > 0 && dedupedUsers.length === 0) {
    throw new ApiError(404, 'NOTIFICATION_TEST_TARGETS_NOT_FOUND', 'No matching users found');
  }

  return dedupedUsers;
}

function toRecipientSummary(user) {
  return {
    userId: user.id,
    email: user.email,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
  };
}

function assertInAppPayload(payload = {}) {
  if (!payload.title || !payload.message) {
    throw new ApiError(
      400,
      'INVALID_NOTIFICATION_TEST_PAYLOAD',
      'title and message are required for test notifications'
    );
  }
}

function assertEmailPayload(payload = {}) {
  if (!payload.subject || !payload.message) {
    throw new ApiError(
      400,
      'INVALID_EMAIL_TEST_PAYLOAD',
      'subject and message are required for test emails'
    );
  }
}

async function previewTargets(filters = {}, options = {}) {
  const recipients = await loadRecipients(filters, options);
  return {
    matchedUsers: recipients.length,
    sampleRecipients: recipients.slice(0, PREVIEW_SAMPLE_SIZE).map(toRecipientSummary),
  };
}

async function sendTestInAppNotification(filters = {}, payload = {}, actor = {}) {
  assertInAppPayload(payload);

  const recipients = await loadRecipients(filters);
  if (recipients.length === 0) {
    throw new ApiError(404, 'NOTIFICATION_TEST_TARGETS_NOT_FOUND', 'No matching users found');
  }

  const requestEventID = uuidv4();
  const result = await notificationPublisher.publishTestInAppRequested(
    {
      eventId: requestEventID,
      receiverIds: recipients.map((user) => user.id),
      title: payload.title,
      message: payload.message,
      category: payload.category || 'system',
      priority: normalizePriority(payload.priority),
      actionUrl: payload.actionUrl,
      actionLabel: payload.actionLabel,
      metadata: payload.metadata || {},
      senderId: actor.userId || null,
      triggeredByAdminId: actor.userId || null,
    },
    {
      sourceEventId: requestEventID,
      correlationId: actor.requestId || requestEventID,
    }
  );

  if (!result) {
    throw new ApiError(
      503,
      'NOTIFICATION_TEST_QUEUE_FAILED',
      'Failed to queue test notification event'
    );
  }

  logger.info(
    {
      eventId: result.eventId,
      matchedUsers: recipients.length,
      triggeredByAdminId: actor.userId || null,
    },
    'Queued test in-app notification event'
  );

  return {
    eventId: result.eventId,
    matchedUsers: recipients.length,
    queuedEvents: 1,
    sampleRecipients: recipients.slice(0, PREVIEW_SAMPLE_SIZE).map(toRecipientSummary),
  };
}

async function sendTestEmail(filters = {}, payload = {}, actor = {}) {
  assertEmailPayload(payload);

  const recipients = await loadRecipients(filters, { requireEmail: true });
  if (recipients.length === 0) {
    throw new ApiError(404, 'EMAIL_TEST_TARGETS_NOT_FOUND', 'No matching emailable users found');
  }

  let queuedEvents = 0;
  const skippedUsers = [];
  const requestEventID = actor.requestId || uuidv4();

  for (const user of recipients) {
    if (!user.email) {
      skippedUsers.push({ userId: user.id, reason: 'missing_email' });
      continue;
    }

    const result = await emailPublisher.publishTestBroadcast(
      {
        eventId: `${requestEventID}-${user.id}`,
        email: user.email,
        subject: payload.subject,
        message: payload.message,
        recipientName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Traveler',
        metadata: payload.metadata || {},
        triggeredByAdminId: actor.userId || null,
      },
      {
        sourceEventId: `${requestEventID}-${user.id}`,
      }
    );

    if (result) {
      queuedEvents += 1;
    } else {
      skippedUsers.push({ userId: user.id, reason: 'publish_failed' });
    }
  }

  if (queuedEvents === 0) {
    throw new ApiError(503, 'EMAIL_TEST_QUEUE_FAILED', 'Failed to queue test email events');
  }

  logger.info(
    {
      matchedUsers: recipients.length,
      queuedEvents,
      skippedUsers: skippedUsers.length,
      triggeredByAdminId: actor.userId || null,
    },
    'Queued test email events'
  );

  return {
    matchedUsers: recipients.length,
    queuedEvents,
    skippedUsers,
    sampleRecipients: recipients.slice(0, PREVIEW_SAMPLE_SIZE).map(toRecipientSummary),
  };
}

module.exports = {
  previewTargets,
  sendTestInAppNotification,
  sendTestEmail,
};
