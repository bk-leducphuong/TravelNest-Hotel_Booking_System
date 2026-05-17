import http from './http'

export const NotificationService = {
  getNotifications(params = {}) {
    return http.get('/notifications', { params })
  },

  getUnreadCount() {
    return http.get('/notifications/unread-count')
  },

  markAllAsRead() {
    return http.patch('/notifications/read-all')
  },

  markAsRead(notificationId) {
    return http.patch(`/notifications/${notificationId}/read`)
  }
}
