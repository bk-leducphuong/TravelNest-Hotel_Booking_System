/**
 * Pure row generator for the `notifications` table.
 *
 * Iterates receivers sequentially and optionally samples a sender from the users
 * sampler. Types/categories/priorities follow the same mapping the legacy
 * seeder uses so enum values stay valid.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'notifications';

const COLUMNS = [
  'id',
  'receiver_id',
  'sender_id',
  'notification_type',
  'category',
  'priority',
  'title',
  'message',
  'is_read',
  'created_at',
  'updated_at',
];

const DEFAULT_NOTIFICATIONS_PER_USER = { min: 3, max: 10 };

const TYPE_CONFIG = [
  { type: 'booking_new', category: 'booking', priority: 'high', title: 'New booking received' },
  {
    type: 'review_new',
    category: 'review',
    priority: 'normal',
    title: 'New review received',
  },
  {
    type: 'booking_cancelled',
    category: 'booking',
    priority: 'normal',
    title: 'Booking cancelled',
  },
  { type: 'payment_success', category: 'payment', priority: 'high', title: 'Payment received' },
  { type: 'system_alert', category: 'system', priority: 'normal', title: 'Booking reminder' },
  {
    type: 'booking_status_update',
    category: 'booking',
    priority: 'normal',
    title: 'Booking updated',
  },
  { type: 'promotion', category: 'marketing', priority: 'low', title: 'New promotion' },
];

const MESSAGES = [
  'Your booking has been confirmed. We look forward to hosting you.',
  'A new review has been posted for your hotel.',
  'Your reservation has been cancelled as requested.',
  'Payment received. Thank you for your booking.',
  'Reminder: your check-in date is approaching.',
  'Your booking details have been updated.',
  'Special offer: enjoy a limited-time discount on your next stay.',
  'System maintenance is scheduled for tonight.',
];

function buildRow(faker, { receiverId, senderId }) {
  const config = faker.helpers.arrayElement(TYPE_CONFIG);
  const createdAt = faker.date.past({ years: 1 });

  return {
    id: uuidv7(),
    receiver_id: receiverId,
    sender_id: senderId,
    notification_type: config.type,
    category: config.category,
    priority: config.priority,
    title: config.title,
    message: faker.helpers.arrayElement(MESSAGES),
    is_read: faker.datatype.boolean({ probability: 0.3 }),
    created_at: createdAt,
    updated_at: createdAt,
  };
}

async function* createRows({
  faker,
  userIds,
  userSampler,
  notificationsPerUser = DEFAULT_NOTIFICATIONS_PER_USER,
}) {
  const min = notificationsPerUser.min ?? DEFAULT_NOTIFICATIONS_PER_USER.min;
  const max = notificationsPerUser.max ?? DEFAULT_NOTIFICATIONS_PER_USER.max;

  for await (const receiverId of userIds) {
    const count = faker.number.int({ min, max });

    for (let i = 0; i < count; i++) {
      const senderId = faker.datatype.boolean({ probability: 0.9 }) ? userSampler.random() : null;
      yield buildRow(faker, { receiverId, senderId });
    }
  }
}

module.exports = {
  COLUMNS,
  DEFAULT_NOTIFICATIONS_PER_USER,
  TABLE,
  buildRow,
  createRows,
};
