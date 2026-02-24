/**
 * Permission Constants
 *
 * Defines all permissions for the hotel booking system.
 * Permission names follow pattern: resource.action (e.g., "hotel.read", "booking.create")
 */

const PERMISSIONS = {
  // ============ HOTEL PERMISSIONS ============
  HOTEL_READ: 'hotel.read',
  HOTEL_CREATE: 'hotel.create',
  HOTEL_UPDATE: 'hotel.update',
  HOTEL_DELETE: 'hotel.delete',
  HOTEL_MANAGE_STAFF: 'hotel.manage_staff',
  HOTEL_VIEW_ANALYTICS: 'hotel.view_analytics',

  // ============ ROOM PERMISSIONS ============
  ROOM_READ: 'room.read',
  ROOM_CREATE: 'room.create',
  ROOM_UPDATE: 'room.update',
  ROOM_DELETE: 'room.delete',
  ROOM_MANAGE_INVENTORY: 'room.manage_inventory',

  // ============ BOOKING PERMISSIONS ============
  BOOKING_READ: 'booking.read',
  BOOKING_CREATE: 'booking.create',
  BOOKING_UPDATE: 'booking.update',
  BOOKING_CANCEL: 'booking.cancel',
  BOOKING_MANAGE: 'booking.manage', // For hotel staff to manage bookings

  // ============ REVIEW PERMISSIONS ============
  REVIEW_READ: 'review.read',
  REVIEW_CREATE: 'review.create',
  REVIEW_UPDATE: 'review.update',
  REVIEW_DELETE: 'review.delete',
  REVIEW_REPLY: 'review.reply', // Hotel can reply to reviews
  REVIEW_MODERATE: 'review.moderate', // Admin/support can moderate

  // ============ USER PERMISSIONS ============
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_MANAGE: 'user.manage', // Admin only

  // ============ PAYMENT PERMISSIONS ============
  PAYMENT_READ: 'payment.read',
  PAYMENT_PROCESS: 'payment.process',
  PAYMENT_REFUND: 'payment.refund',

  // ============ NOTIFICATION PERMISSIONS ============
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_SEND: 'notification.send',

  // ============ REPORT/ANALYTICS PERMISSIONS ============
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',

  // ============ ADMIN PERMISSIONS ============
  ADMIN_DASHBOARD: 'admin.dashboard',
  ADMIN_MANAGE_USERS: 'admin.manage_users',
  ADMIN_MANAGE_HOTELS: 'admin.manage_hotels',
  ADMIN_MANAGE_ROLES: 'admin.manage_roles',
  ADMIN_VIEW_LOGS: 'admin.view_logs',
  ADMIN_SYSTEM_SETTINGS: 'admin.system_settings',

  // ============ SUPPORT PERMISSIONS ============
  SUPPORT_VIEW_TICKETS: 'support.view_tickets',
  SUPPORT_RESPOND_TICKETS: 'support.respond_tickets',
  SUPPORT_VIEW_USER_DETAILS: 'support.view_user_details',
};

/**
 * Permission descriptions for seeding
 */
const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.HOTEL_READ]: 'View hotel details',
  [PERMISSIONS.HOTEL_CREATE]: 'Create new hotels',
  [PERMISSIONS.HOTEL_UPDATE]: 'Update hotel information',
  [PERMISSIONS.HOTEL_DELETE]: 'Delete hotels',
  [PERMISSIONS.HOTEL_MANAGE_STAFF]: 'Manage hotel staff members',
  [PERMISSIONS.HOTEL_VIEW_ANALYTICS]: 'View hotel analytics and reports',

  [PERMISSIONS.ROOM_READ]: 'View room details',
  [PERMISSIONS.ROOM_CREATE]: 'Create new rooms',
  [PERMISSIONS.ROOM_UPDATE]: 'Update room information',
  [PERMISSIONS.ROOM_DELETE]: 'Delete rooms',
  [PERMISSIONS.ROOM_MANAGE_INVENTORY]: 'Manage room inventory and availability',

  [PERMISSIONS.BOOKING_READ]: 'View booking details',
  [PERMISSIONS.BOOKING_CREATE]: 'Create new bookings',
  [PERMISSIONS.BOOKING_UPDATE]: 'Update booking information',
  [PERMISSIONS.BOOKING_CANCEL]: 'Cancel bookings',
  [PERMISSIONS.BOOKING_MANAGE]: 'Manage all bookings for a hotel',

  [PERMISSIONS.REVIEW_READ]: 'View reviews',
  [PERMISSIONS.REVIEW_CREATE]: 'Create reviews',
  [PERMISSIONS.REVIEW_UPDATE]: 'Update own reviews',
  [PERMISSIONS.REVIEW_DELETE]: 'Delete reviews',
  [PERMISSIONS.REVIEW_REPLY]: 'Reply to reviews',
  [PERMISSIONS.REVIEW_MODERATE]: 'Moderate and manage all reviews',

  [PERMISSIONS.USER_READ]: 'View user profile',
  [PERMISSIONS.USER_UPDATE]: 'Update user profile',
  [PERMISSIONS.USER_DELETE]: 'Delete user account',
  [PERMISSIONS.USER_MANAGE]: 'Manage all users',

  [PERMISSIONS.PAYMENT_READ]: 'View payment details',
  [PERMISSIONS.PAYMENT_PROCESS]: 'Process payments',
  [PERMISSIONS.PAYMENT_REFUND]: 'Process refunds',

  [PERMISSIONS.NOTIFICATION_READ]: 'View notifications',
  [PERMISSIONS.NOTIFICATION_SEND]: 'Send notifications',

  [PERMISSIONS.REPORT_VIEW]: 'View reports and analytics',
  [PERMISSIONS.REPORT_EXPORT]: 'Export reports',

  [PERMISSIONS.ADMIN_DASHBOARD]: 'Access admin dashboard',
  [PERMISSIONS.ADMIN_MANAGE_USERS]: 'Manage all users in the system',
  [PERMISSIONS.ADMIN_MANAGE_HOTELS]: 'Manage all hotels in the system',
  [PERMISSIONS.ADMIN_MANAGE_ROLES]: 'Manage roles and permissions',
  [PERMISSIONS.ADMIN_VIEW_LOGS]: 'View system logs',
  [PERMISSIONS.ADMIN_SYSTEM_SETTINGS]: 'Manage system settings',

  [PERMISSIONS.SUPPORT_VIEW_TICKETS]: 'View support tickets',
  [PERMISSIONS.SUPPORT_RESPOND_TICKETS]: 'Respond to support tickets',
  [PERMISSIONS.SUPPORT_VIEW_USER_DETAILS]: 'View user details for support',
};

/**
 * Role to Permission Mapping
 * Defines which permissions each role has
 */
const ROLE_PERMISSIONS = {
  // Guest - minimal permissions (not logged in)
  guest: [PERMISSIONS.HOTEL_READ, PERMISSIONS.ROOM_READ, PERMISSIONS.REVIEW_READ],

  // Regular user - can book and review
  user: [
    PERMISSIONS.HOTEL_READ,
    PERMISSIONS.ROOM_READ,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_CREATE,
    PERMISSIONS.REVIEW_UPDATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.NOTIFICATION_READ,
  ],

  // Hotel staff - can manage bookings and rooms
  staff: [
    PERMISSIONS.HOTEL_READ,
    PERMISSIONS.ROOM_READ,
    PERMISSIONS.ROOM_UPDATE,
    PERMISSIONS.ROOM_MANAGE_INVENTORY,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_MANAGE,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_REPLY,
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.NOTIFICATION_SEND,
  ],

  // Hotel manager - full hotel management
  manager: [
    PERMISSIONS.HOTEL_READ,
    PERMISSIONS.HOTEL_UPDATE,
    PERMISSIONS.HOTEL_VIEW_ANALYTICS,
    PERMISSIONS.ROOM_READ,
    PERMISSIONS.ROOM_CREATE,
    PERMISSIONS.ROOM_UPDATE,
    PERMISSIONS.ROOM_DELETE,
    PERMISSIONS.ROOM_MANAGE_INVENTORY,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.BOOKING_MANAGE,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_REPLY,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.NOTIFICATION_SEND,
    PERMISSIONS.REPORT_VIEW,
  ],

  // Hotel owner - full hotel control including staff management
  owner: [
    PERMISSIONS.HOTEL_READ,
    PERMISSIONS.HOTEL_CREATE,
    PERMISSIONS.HOTEL_UPDATE,
    PERMISSIONS.HOTEL_DELETE,
    PERMISSIONS.HOTEL_MANAGE_STAFF,
    PERMISSIONS.HOTEL_VIEW_ANALYTICS,
    PERMISSIONS.ROOM_READ,
    PERMISSIONS.ROOM_CREATE,
    PERMISSIONS.ROOM_UPDATE,
    PERMISSIONS.ROOM_DELETE,
    PERMISSIONS.ROOM_MANAGE_INVENTORY,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.BOOKING_MANAGE,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_REPLY,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.NOTIFICATION_SEND,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
  ],

  // Support agent - can view and help users
  support_agent: [
    PERMISSIONS.HOTEL_READ,
    PERMISSIONS.ROOM_READ,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_MODERATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.NOTIFICATION_SEND,
    PERMISSIONS.SUPPORT_VIEW_TICKETS,
    PERMISSIONS.SUPPORT_RESPOND_TICKETS,
    PERMISSIONS.SUPPORT_VIEW_USER_DETAILS,
  ],

  // Admin - full system access
  admin: Object.values(PERMISSIONS),
};

module.exports = {
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_PERMISSIONS,
};
