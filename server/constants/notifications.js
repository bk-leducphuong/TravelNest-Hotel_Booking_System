/**
 * Notification Constants
 * Centralized definition of notification types, categories, and priorities
 */

// Notification Types
const NOTIFICATION_TYPES = {
  // Booking notifications
  BOOKING_NEW: 'booking_new',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_STATUS_UPDATE: 'booking_status_update',

  // Payment notifications
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REFUND: 'payment_refund',

  // Payout notifications
  PAYOUT_COMPLETED: 'payout_completed',
  PAYOUT_FAILED: 'payout_failed',

  // Review notifications
  REVIEW_NEW: 'review_new',
  REVIEW_RESPONSE: 'review_response',

  // Message notifications
  MESSAGE_NEW: 'message_new',

  // System notifications
  SYSTEM_ALERT: 'system_alert',
  PROMOTION: 'promotion',
  ACCOUNT_UPDATE: 'account_update',
};

// Notification Categories
const NOTIFICATION_CATEGORIES = {
  BOOKING: 'booking',
  PAYMENT: 'payment',
  REVIEW: 'review',
  MESSAGE: 'message',
  SYSTEM: 'system',
  MARKETING: 'marketing',
};

// Notification Priorities
const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Related Entity Types (for polymorphic associations)
const RELATED_ENTITY_TYPES = {
  BOOKING: 'booking',
  PAYMENT: 'payment',
  TRANSACTION: 'transaction',
  REVIEW: 'review',
  HOTEL: 'hotel',
  ROOM: 'room',
  USER: 'user',
  REFUND: 'refund',
};

// Notification Templates
const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.BOOKING_NEW]: {
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    getTitleTemplate: (data) => `New Booking #${data.bookingCode}`,
    getMessageTemplate: (data) =>
      `You have received a new booking from ${data.guestName} for ${data.numberOfGuests} guest(s), checking in on ${data.checkInDate}.`,
    getActionUrl: (data) => `/admin/bookings/${data.bookingId}`,
    getActionLabel: () => 'View Booking',
  },

  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: {
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    getTitleTemplate: (data) => `Booking Confirmed - ${data.bookingCode}`,
    getMessageTemplate: (data) =>
      `Your booking at ${data.hotelName} has been confirmed. Check-in: ${data.checkInDate}, Check-out: ${data.checkOutDate}.`,
    getActionUrl: (data) => `/bookings/${data.bookingId}`,
    getActionLabel: () => 'View Details',
  },

  [NOTIFICATION_TYPES.BOOKING_CANCELLED]: {
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    getTitleTemplate: (data) => `Booking Cancelled - ${data.bookingCode}`,
    getMessageTemplate: (data) =>
      `Booking #${data.bookingCode} has been cancelled. ${data.reason || 'Refund will be processed if applicable.'}`,
    getActionUrl: (data) => `/bookings/${data.bookingId}`,
    getActionLabel: () => 'View Details',
  },

  [NOTIFICATION_TYPES.BOOKING_COMPLETED]: {
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    getTitleTemplate: (data) => `Booking Completed - ${data.bookingCode}`,
    getMessageTemplate: (data) =>
      `Thank you for staying at ${data.hotelName}! We hope you enjoyed your visit. Please consider leaving a review.`,
    getActionUrl: (data) => `/bookings/${data.bookingId}/review`,
    getActionLabel: () => 'Leave Review',
  },

  [NOTIFICATION_TYPES.BOOKING_STATUS_UPDATE]: {
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    getTitleTemplate: (data) => `Booking Status Updated - ${data.bookingCode}`,
    getMessageTemplate: (data) =>
      `Your booking status has been updated from ${data.oldStatus} to ${data.newStatus}.`,
    getActionUrl: (data) => `/bookings/${data.bookingId}`,
    getActionLabel: () => 'View Booking',
  },

  [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: {
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    getTitleTemplate: (data) => 'Payment Successful',
    getMessageTemplate: (data) =>
      `Your payment of ${data.currency} ${data.amount} has been processed successfully. Booking code: ${data.bookingCode}.`,
    getActionUrl: (data) => `/bookings/${data.bookingId}`,
    getActionLabel: () => 'View Receipt',
  },

  [NOTIFICATION_TYPES.PAYMENT_FAILED]: {
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    getTitleTemplate: () => 'Payment Failed',
    getMessageTemplate: (data) =>
      `Your payment could not be processed. ${data.reason || 'Please check your payment method and try again.'}`,
    getActionUrl: (data) => `/bookings/${data.bookingId}/payment`,
    getActionLabel: () => 'Retry Payment',
  },

  [NOTIFICATION_TYPES.PAYMENT_REFUND]: {
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    getTitleTemplate: (data) => 'Refund Processed',
    getMessageTemplate: (data) =>
      `A refund of ${data.currency} ${data.amount} has been processed for booking ${data.bookingCode}. It may take 5-10 business days to appear in your account.`,
    getActionUrl: (data) => `/bookings/${data.bookingId}`,
    getActionLabel: () => 'View Details',
  },

  [NOTIFICATION_TYPES.PAYOUT_COMPLETED]: {
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    getTitleTemplate: () => 'Payout Completed',
    getMessageTemplate: (data) =>
      `Your payout of ${data.currency} ${data.amount} has been successfully transferred to your account.`,
    getActionUrl: (data) => `/admin/payouts/${data.payoutId}`,
    getActionLabel: () => 'View Payout',
  },

  [NOTIFICATION_TYPES.PAYOUT_FAILED]: {
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    getTitleTemplate: () => 'Payout Failed',
    getMessageTemplate: (data) =>
      `Your payout of ${data.currency} ${data.amount} could not be processed. ${data.reason || 'Please check your account details.'}`,
    getActionUrl: () => '/admin/settings/payment',
    getActionLabel: () => 'Update Payment Info',
  },

  [NOTIFICATION_TYPES.REVIEW_NEW]: {
    category: NOTIFICATION_CATEGORIES.REVIEW,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    getTitleTemplate: (data) => 'New Review Received',
    getMessageTemplate: (data) =>
      `${data.reviewerName} left a ${data.rating}-star review for your property. "${data.reviewText?.substring(0, 100)}..."`,
    getActionUrl: (data) => `/admin/reviews/${data.reviewId}`,
    getActionLabel: () => 'View & Respond',
  },

  [NOTIFICATION_TYPES.REVIEW_RESPONSE]: {
    category: NOTIFICATION_CATEGORIES.REVIEW,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    getTitleTemplate: (data) => `${data.hotelName} responded to your review`,
    getMessageTemplate: (data) =>
      `The property has responded to your review. "${data.responseText?.substring(0, 100)}..."`,
    getActionUrl: (data) => `/reviews/${data.reviewId}`,
    getActionLabel: () => 'View Response',
  },

  [NOTIFICATION_TYPES.MESSAGE_NEW]: {
    category: NOTIFICATION_CATEGORIES.MESSAGE,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    getTitleTemplate: (data) => `New message from ${data.senderName}`,
    getMessageTemplate: (data) => data.messagePreview,
    getActionUrl: (data) => `/messages/${data.conversationId}`,
    getActionLabel: () => 'Reply',
  },

  [NOTIFICATION_TYPES.SYSTEM_ALERT]: {
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    getTitleTemplate: (data) => data.title || 'System Alert',
    getMessageTemplate: (data) => data.message,
    getActionUrl: (data) => data.actionUrl || null,
    getActionLabel: (data) => data.actionLabel || null,
  },

  [NOTIFICATION_TYPES.PROMOTION]: {
    category: NOTIFICATION_CATEGORIES.MARKETING,
    priority: NOTIFICATION_PRIORITIES.LOW,
    getTitleTemplate: (data) => data.title,
    getMessageTemplate: (data) => data.message,
    getActionUrl: (data) => data.actionUrl || null,
    getActionLabel: (data) => data.actionLabel || 'Learn More',
  },

  [NOTIFICATION_TYPES.ACCOUNT_UPDATE]: {
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    getTitleTemplate: () => 'Account Updated',
    getMessageTemplate: (data) => data.message,
    getActionUrl: () => '/account/settings',
    getActionLabel: () => 'View Settings',
  },
};

// Helper function to get category from notification type
const getCategoryFromType = (notificationType) => {
  const template = NOTIFICATION_TEMPLATES[notificationType];
  return template?.category || NOTIFICATION_CATEGORIES.SYSTEM;
};

// Helper function to get priority from notification type
const getPriorityFromType = (notificationType) => {
  const template = NOTIFICATION_TEMPLATES[notificationType];
  return template?.priority || NOTIFICATION_PRIORITIES.NORMAL;
};

// Helper function to build notification from template
const buildNotificationFromTemplate = (notificationType, data) => {
  const template = NOTIFICATION_TEMPLATES[notificationType];

  if (!template) {
    throw new Error(`Unknown notification type: ${notificationType}`);
  }

  return {
    notification_type: notificationType,
    category: template.category,
    priority: template.priority,
    title: template.getTitleTemplate(data),
    message: template.getMessageTemplate(data),
    action_url: template.getActionUrl?.(data) || null,
    action_label: template.getActionLabel?.(data) || null,
    metadata: data,
  };
};

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  RELATED_ENTITY_TYPES,
  NOTIFICATION_TEMPLATES,
  getCategoryFromType,
  getPriorityFromType,
  buildNotificationFromTemplate,
};
