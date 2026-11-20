const logger = require('@config/logger.config');
const { v4: uuidv4 } = require('uuid');
const db = require('@models');

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateOnly(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function toStartOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function calculateNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return 0;
  return Math.max(0, Math.round((toStartOfDay(checkOutDate) - toStartOfDay(checkInDate)) / DAY_MS));
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildRow(searchData) {
  const {
    destinationId,
    destinationType,
    userId,
    latitude,
    longitude,
    radius,
    checkInDate,
    checkOutDate,
    adults,
    children = 0,
    rooms,
    searchTime = new Date(),
  } = searchData;

  const checkIn = toDate(checkInDate);
  const checkOut = toDate(checkOutDate);
  const now = new Date();

  return {
    search_id: uuidv4(),
    user_id: userId || null,
    destination_id: destinationId || null,
    destination_type: destinationType || '',
    latitude: toNumberOrNull(latitude),
    longitude: toNumberOrNull(longitude),
    radius: toNumberOrNull(radius),
    search_time: toDate(searchTime) || now,
    adults,
    children,
    rooms,
    check_in_date: toDateOnly(checkIn),
    check_out_date: toDateOnly(checkOut),
    nights: calculateNights(checkIn, checkOut),
    is_deleted: false,
    created_at: now,
    updated_at: now,
  };
}

class SearchLogRepository {
  async createSearchLog(searchData) {
    const rows = await this.createSearchLogs([searchData]);
    return rows.inserted_count > 0 ? { search_id: rows.search_ids[0] } : null;
  }

  async createSearchLogs(searchLogs) {
    if (!Array.isArray(searchLogs) || searchLogs.length === 0) {
      return { inserted_count: 0, search_ids: [] };
    }

    const rows = searchLogs.map(buildRow);

    try {
      const created = await db.analytics_search_logs.bulkCreate(rows, {
        ignoreDuplicates: true,
      });
      logger.info({ count: created.length }, 'Search logs created in MySQL');
      return { inserted_count: created.length, search_ids: rows.map((row) => row.search_id) };
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack, rowCount: rows.length },
        `Failed to create search logs in MySQL: ${error.message}`
      );
      throw error;
    }
  }

  async clear() {
    await db.analytics_search_logs.destroy({ where: {}, truncate: true });
  }
}

module.exports = new SearchLogRepository();
