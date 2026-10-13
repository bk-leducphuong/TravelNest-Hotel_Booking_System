const axios = require('axios');

const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');

const DEFAULT_BASE_URL = 'http://localhost:8081';
const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_CACHE_TTL_MS = 60000;
const DEFAULT_BREAKER_THRESHOLD = 2;
const DEFAULT_BREAKER_COOLDOWN_MS = 30000;

class AnalyticsService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.ANALYTICS_SERVICE_URL || DEFAULT_BASE_URL,
      timeout: parseInt(process.env.ANALYTICS_SERVICE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS, 10),
    });

    this.cacheTtlMs = parseInt(process.env.ANALYTICS_CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS, 10);
    this.breakerThreshold = parseInt(
      process.env.ANALYTICS_BREAKER_THRESHOLD || DEFAULT_BREAKER_THRESHOLD,
      10
    );
    this.breakerCooldownMs = parseInt(
      process.env.ANALYTICS_BREAKER_COOLDOWN_MS || DEFAULT_BREAKER_COOLDOWN_MS,
      10
    );

    this.cache = new Map();
    this.breaker = { consecutiveFailures: 0, openUntil: 0 };
  }

  /**
   * Cache + circuit-breaker wrapper for non-critical reads (trending widgets).
   *
   * Trending is a "nice to have" on the home page. Blocking the request on a
   * slow analytics call made the API exceed the edge timeout, which surfaced to
   * browsers as an opaque Cloudflare 502 / CORS error. Serving a cached value
   * (or an empty list) keeps the endpoint fast and available.
   */
  async readWithFallback(path, params, { ttlMs = this.cacheTtlMs, fallback = [] } = {}) {
    const key = `${path}?${JSON.stringify(params)}`;
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && now - cached.storedAt < ttlMs) {
      return cached.value;
    }

    if (this.breaker.openUntil > now) {
      return cached ? cached.value : fallback;
    }

    try {
      const value = await this.request(path, params);
      this.breaker.consecutiveFailures = 0;
      this.breaker.openUntil = 0;
      this.cache.set(key, { value, storedAt: now });
      return value;
    } catch (error) {
      this.breaker.consecutiveFailures += 1;

      if (this.breaker.consecutiveFailures >= this.breakerThreshold) {
        this.breaker.openUntil = now + this.breakerCooldownMs;
      }

      logger.warn(
        { error: error.message, path, cached: Boolean(cached) },
        'Analytics unavailable; serving cached/empty data'
      );

      return cached ? cached.value : fallback;
    }
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
    const rows = await this.readWithFallback('/analytics/trending/hotels', { limit, days });
    return Array.isArray(rows) ? rows : [];
  }

  async getTrendingDestinations({ limit = 5, days = 30 } = {}) {
    const rows = await this.readWithFallback('/analytics/trending/destinations', { limit, days });
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
