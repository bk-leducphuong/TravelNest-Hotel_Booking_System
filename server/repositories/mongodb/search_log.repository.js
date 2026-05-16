const logger = require('@config/logger.config');
const SearchLog = require('@models/mongo/search_log.model');
const { v4: uuidv4 } = require('uuid');

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toStartOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toDateString(date) {
  return date ? new Date(date).toISOString().split('T')[0] : null;
}

function calculateNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return 0;
  return Math.max(0, Math.round((toStartOfDay(checkOutDate) - toStartOfDay(checkInDate)) / DAY_MS));
}

class SearchLogMongoRepository {
  async createSearchLog(searchData) {
    const {
      destinationId,
      destinationType,
      userId,
      checkInDate,
      checkOutDate,
      adults,
      children = 0,
      rooms,
      searchTime = new Date(),
    } = searchData;

    const searchId = uuidv4();
    const checkIn = toDate(checkInDate);
    const checkOut = toDate(checkOutDate);

    try {
      await SearchLog.create({
        searchId,
        userId: userId || null,
        destinationId: destinationId || null,
        destinationType: destinationType || '',
        searchTime: toDate(searchTime) || new Date(),
        adults,
        children,
        rooms,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights: calculateNights(checkIn, checkOut),
        isDeleted: false,
      });

      logger.info({ searchId, destinationId, destinationType }, 'Search log created in MongoDB');
      return { search_id: searchId };
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack, searchData },
        `Failed to create search log in MongoDB: ${error.message}`
      );
      throw error;
    }
  }

  async createSearchLogs(searchLogs) {
    if (!Array.isArray(searchLogs) || searchLogs.length === 0) {
      return { inserted_count: 0 };
    }

    const documents = searchLogs.map((searchData) => {
      const {
        destinationId,
        destinationType,
        userId,
        checkInDate,
        checkOutDate,
        adults,
        children = 0,
        rooms,
        searchTime = new Date(),
      } = searchData;
      const checkIn = toDate(checkInDate);
      const checkOut = toDate(checkOutDate);

      return {
        searchId: uuidv4(),
        userId: userId || null,
        destinationId: destinationId || null,
        destinationType: destinationType || '',
        searchTime: toDate(searchTime) || new Date(),
        adults,
        children,
        rooms,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights: calculateNights(checkIn, checkOut),
        isDeleted: false,
      };
    });

    try {
      const result = await SearchLog.insertMany(documents, { ordered: false });
      logger.info({ count: result.length }, 'Search logs created in MongoDB');
      return { inserted_count: result.length };
    } catch (error) {
      if (error?.insertedDocs?.length > 0) {
        logger.warn(
          { insertedCount: error.insertedDocs.length, error: error.message },
          'Search logs partially created in MongoDB'
        );
        return { inserted_count: error.insertedDocs.length };
      }

      logger.error(
        { error: error.message, stack: error.stack },
        `Failed to create search logs in MongoDB: ${error.message}`
      );
      throw error;
    }
  }

  async findSearchLogsByUserId(userId, limit = 10) {
    try {
      const rows = await SearchLog.find({ userId, isDeleted: false })
        .sort({ searchTime: -1 })
        .limit(Math.max(1, parseInt(limit, 10) || 10))
        .lean();

      return rows.map((row) => ({
        search_id: row.searchId,
        check_in_date: toDateString(row.checkInDate),
        check_out_date: toDateString(row.checkOutDate),
        adults: row.adults,
        children: row.children,
        rooms: row.rooms,
        search_time: row.searchTime,
      }));
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack, userId },
        `Failed to fetch user search logs from MongoDB: ${error.message}`
      );
      throw error;
    }
  }

  async deleteSearchLogById(searchId) {
    try {
      await SearchLog.updateOne({ searchId }, { $set: { isDeleted: true } });
      logger.info({ searchId }, 'Search log deleted from MongoDB');
      return true;
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack, searchId },
        `Failed to delete search log from MongoDB: ${error.message}`
      );
      throw error;
    }
  }

  async findPopularPlaces(limit = 5, days = 30) {
    const since = new Date(Date.now() - Math.max(0, days - 1) * DAY_MS);
    since.setUTCHours(0, 0, 0, 0);

    try {
      return await SearchLog.aggregate([
        {
          $match: {
            isDeleted: false,
            destinationId: { $ne: null },
            searchTime: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              destinationId: '$destinationId',
              destinationType: '$destinationType',
            },
            search_count: { $sum: 1 },
            users: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            _id: 0,
            destination_id: '$_id.destinationId',
            destination_type: '$_id.destinationType',
            search_count: 1,
            unique_users: {
              $size: {
                $filter: {
                  input: '$users',
                  as: 'userId',
                  cond: { $ne: ['$$userId', null] },
                },
              },
            },
          },
        },
        { $sort: { search_count: -1 } },
        { $limit: Math.max(1, parseInt(limit, 10) || 5) },
      ]);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        `Failed to fetch popular places from MongoDB: ${error.message}`
      );
      throw error;
    }
  }

  async getDemandByTravelDate(nextDays = 90, limit = 50) {
    const start = toStartOfDay(new Date());
    const end = new Date(start.getTime() + Math.max(1, nextDays) * DAY_MS);

    try {
      const rows = await SearchLog.aggregate([
        {
          $match: {
            isDeleted: false,
            checkInDate: { $gte: start, $lte: end },
            destinationId: { $ne: null },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$checkInDate' } },
              destinationId: '$destinationId',
              destinationType: '$destinationType',
            },
            search_count: { $sum: 1 },
            avg_nights: { $avg: '$nights' },
            avg_guests: { $avg: { $add: ['$adults', '$children'] } },
          },
        },
        {
          $project: {
            _id: 0,
            check_in_date: '$_id.date',
            destination_id: '$_id.destinationId',
            destination_type: '$_id.destinationType',
            search_count: 1,
            avg_nights: 1,
            avg_guests: 1,
          },
        },
        { $sort: { search_count: -1 } },
        { $limit: Math.max(1, parseInt(limit, 10) || 50) },
      ]);

      return rows;
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        `Failed to fetch demand by travel date from MongoDB: ${error.message}`
      );
      throw error;
    }
  }

  async getUserSearchSummary(userId) {
    try {
      const rows = await SearchLog.aggregate([
        { $match: { userId, isDeleted: false } },
        {
          $group: {
            _id: '$userId',
            total_searches: { $sum: 1 },
            destinations: { $addToSet: '$destinationId' },
            last_search_time: { $max: '$searchTime' },
            first_search_time: { $min: '$searchTime' },
          },
        },
        {
          $project: {
            _id: 0,
            user_id: '$_id',
            total_searches: 1,
            locations_visited: {
              $filter: {
                input: '$destinations',
                as: 'destinationId',
                cond: { $ne: ['$$destinationId', null] },
              },
            },
            last_search_time: 1,
            first_search_time: 1,
          },
        },
        {
          $addFields: {
            unique_locations: { $size: '$locations_visited' },
          },
        },
      ]);

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack, userId },
        `Failed to fetch user search summary from MongoDB: ${error.message}`
      );
      throw error;
    }
  }

  async getPeakSearchTimes() {
    try {
      return await SearchLog.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: {
              hour: { $hour: '$searchTime' },
              day: { $isoDayOfWeek: '$searchTime' },
            },
            search_count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            hour_of_day: '$_id.hour',
            day_of_week: '$_id.day',
            search_count: 1,
          },
        },
        { $sort: { search_count: -1 } },
      ]);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        `Failed to fetch peak search times from MongoDB: ${error.message}`
      );
      throw error;
    }
  }

  async getSearchTrendsByDestination(destinationId, days = 30) {
    const since = new Date(Date.now() - Math.max(0, days - 1) * DAY_MS);
    since.setUTCHours(0, 0, 0, 0);

    try {
      return await SearchLog.aggregate([
        {
          $match: {
            destinationId,
            isDeleted: false,
            searchTime: { $gte: since },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$searchTime' } },
            search_count: { $sum: 1 },
            users: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            search_count: 1,
            unique_users: {
              $size: {
                $filter: {
                  input: '$users',
                  as: 'userId',
                  cond: { $ne: ['$$userId', null] },
                },
              },
            },
          },
        },
        { $sort: { date: 1 } },
      ]);
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        `Failed to fetch search trends from MongoDB: ${error.message}`
      );
      throw error;
    }
  }
}

module.exports = new SearchLogMongoRepository();
