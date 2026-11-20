const logger = require('@config/logger.config');
const { v4: uuidv4 } = require('uuid');
const db = require('@models');

function buildRow(event) {
  const now = new Date();

  return {
    event_id: event.eventId || event.event_id || uuidv4(),
    hotel_id: event.hotelId || event.hotel_id,
    user_id: event.userId || event.user_id || null,
    session_id: event.sessionId || event.session_id || '',
    viewed_at: event.viewedAt || event.viewed_at || now,
    ip_address: event.ipAddress || event.ip_address || '',
    user_agent: event.userAgent || event.user_agent || '',
    created_at: now,
    updated_at: now,
  };
}

class HotelViewEventRepository {
  async insertHotelViewEvents(events = []) {
    if (!Array.isArray(events) || events.length === 0) {
      return { inserted: 0, eventIds: [] };
    }

    const rows = events.map(buildRow);

    try {
      const created = await db.analytics_hotel_view_events.bulkCreate(rows, {
        ignoreDuplicates: true,
      });
      return { inserted: created.length, eventIds: rows.map((row) => row.event_id) };
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack, rowCount: rows.length },
        `Failed to insert hotel view events into MySQL: ${error.message}`
      );
      throw error;
    }
  }

  async clear() {
    await db.analytics_hotel_view_events.destroy({ where: {}, truncate: true });
  }
}

module.exports = new HotelViewEventRepository();
