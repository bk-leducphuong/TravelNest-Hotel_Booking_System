const axios = require('axios');
const ApiError = require('@utils/ApiError');

const NOTIFICATION_SERVICE_URL = (
  process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8083'
).replace(/\/$/, '');

class NotificationProxyService {
  constructor() {
    this.client = axios.create({
      baseURL: NOTIFICATION_SERVICE_URL,
      timeout: Number(process.env.NOTIFICATION_SERVICE_TIMEOUT_MS || 10000),
    });
  }

  async getNotifications(userId, options = {}) {
    return this.request(() =>
      this.client.get('/notifications', {
        headers: this.headers(userId),
        params: {
          page: options.page,
          limit: options.limit,
          unreadOnly: options.unreadOnly,
          category: options.category,
          type: options.type,
          priority: options.priority,
        },
      })
    );
  }

  async markNotificationAsRead(notificationId, userId) {
    return this.request(() =>
      this.client.patch(`/notifications/${notificationId}/read`, null, {
        headers: this.headers(userId),
      })
    );
  }

  async markAllNotificationsAsRead(userId) {
    return this.request(() =>
      this.client.patch('/notifications/read-all', null, {
        headers: this.headers(userId),
      })
    );
  }

  async getUnreadCount(userId) {
    return this.request(() =>
      this.client.get('/notifications/unread-count', {
        headers: this.headers(userId),
      })
    );
  }

  headers(userId) {
    return {
      'X-User-Id': userId,
      ...(process.env.INTERNAL_SERVICE_TOKEN
        ? { 'X-Internal-Service-Token': process.env.INTERNAL_SERVICE_TOKEN }
        : {}),
    };
  }

  async request(callback) {
    try {
      const response = await callback();
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        const { code, message, details } = error.response.data.error;
        throw new ApiError(error.response.status, code, message, details);
      }
      throw new ApiError(
        502,
        'NOTIFICATION_SERVICE_UNAVAILABLE',
        'Notification service unavailable',
        {
          originalError: error.message,
        }
      );
    }
  }
}

module.exports = new NotificationProxyService();
