const { getClient } = require('@config/clickhouse.config');
const logger = require('@config/logger.config');
const { v4: uuidv4 } = require('uuid');

/**
 * ClickHouse Search Log Repository
 * Handles all search log operations in ClickHouse
 */
class SearchLogClickHouseRepository {
  constructor() {
    this.client = getClient();
    this.tableName = 'travelnest.search_logs';
  }

  /**
   * Create search log entry
   * @param {Object} searchData
   * @returns {Promise<Object>} Created log with search_id
   */
  async createSearchLog(searchData) {
    const {
      location,
      userId,
      checkInDate,
      checkOutDate,
      adults,
      children = 0,
      rooms,
    } = searchData;

    const searchId = uuidv4();

    // Format dates for ClickHouse Date type (YYYY-MM-DD)
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
    };

    try {
      await this.client.insert({
        table: this.tableName,
        values: [
          {
            search_id: searchId,
            user_id: userId || null,
            location,
            search_time: new Date()
              .toISOString()
              .slice(0, 19)
              .replace('T', ' '),
            adults,
            children,
            rooms,
            check_in_date: formatDate(checkInDate),
            check_out_date: formatDate(checkOutDate),
            is_deleted: 0,
          },
        ],
        format: 'JSONEachRow',
      });

      logger.info({ searchId, location }, 'Search log created in ClickHouse');

      return { search_id: searchId };
    } catch (error) {
      logger.error(
        {
          error: error.message,
          errorCode: error.code,
          errorType: error.type,
          stack: error.stack,
          searchData,
          insertValues: {
            search_id: searchId,
            user_id: userId || null,
            location,
            search_time: new Date(),
            adults,
            children,
            rooms,
            check_in_date: checkInDate || null,
            check_out_date: checkOutDate || null,
            is_deleted: 0,
          },
        },
        `Failed to create search log in ClickHouse: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Find search logs by user ID (recent searches)
   * @param {string} userId - UUID
   * @param {number} limit - Max results
   * @returns {Promise<Array>}
   */
  async findSearchLogsByUserId(userId, limit = 10) {
    try {
      const result = await this.client.query({
        query: `
          SELECT 
            toString(search_id) as search_id,
            location,
            check_in_date,
            check_out_date,
            adults,
            children,
            rooms,
            search_time
          FROM ${this.tableName}
          WHERE user_id = {userId:UUID}
            AND is_deleted = 0
          ORDER BY search_time DESC
          LIMIT {limit:UInt32}
        `,
        query_params: {
          userId,
          limit,
        },
        format: 'JSONEachRow',
      });

      return await result.json();
    } catch (error) {
      logger.error(
        {
          error: error.message,
          errorCode: error.code,
          errorType: error.type,
          stack: error.stack,
          userId,
        },
        `Failed to fetch user search logs from ClickHouse: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Delete search log by ID (soft delete)
   * @param {string} searchId - UUID
   * @returns {Promise<boolean>}
   */
  async deleteSearchLogById(searchId) {
    try {
      // Use lightweight delete (mutation)
      await this.client.command({
        query: `
          ALTER TABLE ${this.tableName}
          DELETE WHERE search_id = {searchId:UUID}
        `,
        query_params: {
          searchId,
        },
      });

      logger.info({ searchId }, 'Search log deleted from ClickHouse');
      return true;
    } catch (error) {
      logger.error(
        {
          error: error.message,
          errorCode: error.code,
          errorType: error.type,
          stack: error.stack,
          searchId,
        },
        `Failed to delete search log from ClickHouse: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Find popular places (from materialized view)
   * @param {number} limit
   * @param {number} days - Look back N days (default 30)
   * @returns {Promise<Array>}
   */
  async findPopularPlaces(limit = 5, days = 30) {
    try {
      const result = await this.client.query({
        query: `
          SELECT 
            location,
            sum(search_count) as search_count,
            sum(unique_users) as unique_users
          FROM travelnest.mv_popular_destinations
          WHERE date >= today() - {days:UInt32}
          GROUP BY location
          ORDER BY search_count DESC
          LIMIT {limit:UInt32}
        `,
        query_params: {
          limit,
          days,
        },
        format: 'JSONEachRow',
      });

      return await result.json();
    } catch (error) {
      logger.error(
        {
          error: error.message,
          errorCode: error.code,
          errorType: error.type,
          stack: error.stack,
        },
        `Failed to fetch popular places from ClickHouse: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Get demand by travel dates (next N days)
   * @param {number} nextDays - Look ahead N days (default 90)
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getDemandByTravelDate(nextDays = 90, limit = 50) {
    try {
      const result = await this.client.query({
        query: `
          SELECT 
            check_in_date,
            location,
            sum(search_count) as search_count,
            avg(avg_nights) as avg_nights,
            avg(avg_guests) as avg_guests
          FROM travelnest.mv_demand_by_travel_date
          WHERE check_in_date BETWEEN today() AND today() + {nextDays:UInt32}
          GROUP BY check_in_date, location
          ORDER BY search_count DESC
          LIMIT {limit:UInt32}
        `,
        query_params: {
          nextDays,
          limit,
        },
        format: 'JSONEachRow',
      });

      return await result.json();
    } catch (error) {
      logger.error(
        {
          error: error.message,
          errorCode: error.code,
          errorType: error.type,
          stack: error.stack,
        },
        `Failed to fetch demand by travel date from ClickHouse: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Get user search summary (personalization)
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getUserSearchSummary(userId) {
    try {
      const result = await this.client.query({
        query: `
          SELECT 
            toString(user_id) as user_id,
            total_searches,
            unique_locations,
            locations_visited,
            last_search_time,
            first_search_time
          FROM travelnest.mv_user_search_summary
          WHERE user_id = {userId:UUID}
        `,
        query_params: {
          userId,
        },
        format: 'JSONEachRow',
      });

      const data = await result.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      logger.error(
        {
          error: error.message,
          errorCode: error.code,
          errorType: error.type,
          stack: error.stack,
          userId,
        },
        `Failed to fetch user search summary from ClickHouse: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Get peak search times (hour of day × day of week)
   * @returns {Promise<Array>}
   */
  async getPeakSearchTimes() {
    try {
      const result = await this.client.query({
        query: `
          SELECT 
            hour_of_day,
            day_of_week,
            sum(search_count) as search_count
          FROM travelnest.mv_search_time_patterns
          GROUP BY hour_of_day, day_of_week
          ORDER BY search_count DESC
        `,
        format: 'JSONEachRow',
      });

      return await result.json();
    } catch (error) {
      logger.error(
        {
          error: error.message,
          errorCode: error.code,
          errorType: error.type,
          stack: error.stack,
        },
        `Failed to fetch peak search times from ClickHouse: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Get search trends by location (daily counts for last N days)
   * @param {string} location
   * @param {number} days
   * @returns {Promise<Array>}
   */
  async getSearchTrendsByLocation(location, days = 30) {
    try {
      const result = await this.client.query({
        query: `
          SELECT 
            date,
            sum(search_count) as search_count,
            sum(unique_users) as unique_users
          FROM travelnest.mv_popular_destinations
          WHERE location = {location:String}
            AND date >= today() - {days:UInt32}
          GROUP BY date
          ORDER BY date ASC
        `,
        query_params: {
          location,
          days,
        },
        format: 'JSONEachRow',
      });

      return await result.json();
    } catch (error) {
      logger.error(
        {
          error: error.message,
          errorCode: error.code,
          errorType: error.type,
          stack: error.stack,
          location,
        },
        `Failed to fetch search trends from ClickHouse: ${error.message}`
      );
      throw error;
    }
  }
}

module.exports = new SearchLogClickHouseRepository();
