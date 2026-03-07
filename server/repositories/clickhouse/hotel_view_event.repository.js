const { getClient } = require('@config/clickhouse.config');
const logger = require('@config/logger.config');
const { v4: uuidv4 } = require('uuid');

class HotelViewEventClickHouseRepository {
  constructor() {
    this.client = getClient();
    this.tableName = 'travelnest.hotel_view_events';
  }

  /**
   * Insert hotel view events (batch).
   * @param {Array<Object>} events
   * @returns {Promise<{ inserted: number, eventIds: string[] }>}
   */
  async insertHotelViewEvents(events = []) {
    if (!Array.isArray(events) || events.length === 0) {
      return { inserted: 0, eventIds: [] };
    }

    const toDateTime = (d) => {
      const date = d instanceof Date ? d : new Date(d || Date.now());
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const rows = events.map((e) => {
      const eventId = e.eventId || e.event_id || uuidv4();
      return {
        event_id: eventId,
        hotel_id: e.hotelId || e.hotel_id,
        user_id: e.userId || e.user_id || null,
        session_id: e.sessionId || e.session_id || '',
        viewed_at: toDateTime(e.viewedAt || e.viewed_at || new Date()),
        ip_address: e.ipAddress || e.ip_address || '',
        user_agent: e.userAgent || e.user_agent || '',
      };
    });

    try {
      await this.client.insert({
        table: this.tableName,
        values: rows,
        format: 'JSONEachRow',
      });

      return { inserted: rows.length, eventIds: rows.map((r) => r.event_id) };
    } catch (error) {
      logger.error(
        {
          error: error.message,
          errorCode: error.code,
          errorType: error.type,
          stack: error.stack,
          rowCount: rows.length,
        },
        `Failed to insert hotel view events into ClickHouse: ${error.message}`
      );
      throw error;
    }
  }
}

module.exports = new HotelViewEventClickHouseRepository();
