const axios = require('axios');

const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');

const DEFAULT_BASE_URL = 'http://localhost:8081';
const DEFAULT_TIMEOUT_MS = 2000;

class AnalyticsService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.ANALYTICS_SERVICE_URL || DEFAULT_BASE_URL,
      timeout: parseInt(process.env.ANALYTICS_SERVICE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS, 10),
    });
  }

  async request(path, params = {}) {
    try {
      const response = await this.client.get(path, { params });
      return response.data;
    } catch (error) {
      logger.error(
        {
          error: error.message,
          status: error.response?.status,
          path,
          params,
        },
        'Analytics service request failed'
      );

      throw new ApiError(502, 'ANALYTICS_SERVICE_UNAVAILABLE', 'Analytics service is unavailable');
    }
  }

  async getTrendingHotels({ limit = 10, days = 2 } = {}) {
    const rows = await this.request('/analytics/trending/hotels', { limit, days });
    return Array.isArray(rows) ? rows : [];
  }

  async getTrendingDestinations({ limit = 5, days = 30 } = {}) {
    const rows = await this.request('/analytics/trending/destinations', { limit, days });
    return Array.isArray(rows) ? rows : [];
  }

  async getSearchDemand({ nextDays = 90, limit = 50 } = {}) {
    const rows = await this.request('/analytics/search/demand', { nextDays, limit });
    return Array.isArray(rows) ? rows : [];
  }

  async healthz() {
    return await this.request('/healthz');
  }

  async getUserSearchSummary(userId) {
    return await this.request(`/analytics/users/${encodeURIComponent(userId)}/search-summary`);
  }

  async getUserSearches(userId, { limit = 10 } = {}) {
    const rows = await this.request(`/analytics/users/${encodeURIComponent(userId)}/searches`, {
      limit,
    });
    return Array.isArray(rows) ? rows : [];
  }
}

module.exports = new AnalyticsService();
