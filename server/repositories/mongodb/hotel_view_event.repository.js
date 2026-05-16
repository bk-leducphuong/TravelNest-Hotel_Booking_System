const logger = require('@config/logger.config');
const HotelViewEvent = require('@models/mongo/hotel_view_event.model');
const { v4: uuidv4 } = require('uuid');

class HotelViewEventMongoRepository {
  async insertHotelViewEvents(events = []) {
    if (!Array.isArray(events) || events.length === 0) {
      return { inserted: 0, eventIds: [] };
    }

    const rows = events.map((event) => ({
      eventId: event.eventId || event.event_id || uuidv4(),
      hotelId: event.hotelId || event.hotel_id,
      userId: event.userId || event.user_id || null,
      sessionId: event.sessionId || event.session_id || '',
      viewedAt: event.viewedAt || event.viewed_at || new Date(),
      ipAddress: event.ipAddress || event.ip_address || '',
      userAgent: event.userAgent || event.user_agent || '',
    }));

    try {
      await HotelViewEvent.insertMany(rows, { ordered: false });
      return { inserted: rows.length, eventIds: rows.map((row) => row.eventId) };
    } catch (error) {
      if (error?.writeErrors?.length) {
        const duplicateErrors = error.writeErrors.filter((err) => err.code === 11000);
        const inserted = rows.length - error.writeErrors.length;

        if (duplicateErrors.length === error.writeErrors.length) {
          return { inserted, eventIds: rows.map((row) => row.eventId) };
        }
      }

      logger.error(
        { error: error.message, stack: error.stack, rowCount: rows.length },
        `Failed to insert hotel view events into MongoDB: ${error.message}`
      );
      throw error;
    }
  }
}

module.exports = new HotelViewEventMongoRepository();
