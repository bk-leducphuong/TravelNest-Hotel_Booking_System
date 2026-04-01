import http from './http';

export const NotificationService = {
  /**
   * Get notifications for authenticated user
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {boolean} params.unreadOnly - Filter unread notifications only
   * @returns {Promise<{data: Array, meta: Object}>}
   */
  getNotifications(params = {}) {
    return http.get('/notifications', { params });
  },

  /**
   * Get unread notification count
   * @returns {Promise<{data: {unreadCount: number}}>}
   */
  getUnreadCount() {
    return http.get('/notifications/unread-count');
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<{data: {message: string, updatedCount: number}}>}
   */
  markAllAsRead() {
    return http.patch('/notifications/read-all');
  },

  /**
   * Mark specific notification as read
   * @param {string} notificationId - Notification ID (UUID)
   * @returns {Promise<{data: {message: string}}>}
   */
  markAsRead(notificationId) {
    return http.patch(`/notifications/${notificationId}/read`);
  },
};

export default NotificationService;
