const holdRepository = require('@repositories/hold.repository');
const inventoryService = require('@services/inventory.service');
const roomInventoryRepository = require('@repositories/room_inventory.repository');
const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const redisClient = require('@config/redis.config');
const { scheduleExpireHold } = require('@utils/bullmq.utils');

/** Default hold duration in minutes (e.g. time to complete payment) */
const HOLD_DURATION_MINUTES = 15;

/**
 * Compute total price for given rooms over date range from inventory
 * @param {Array<{roomId: string, quantity: number}>} rooms
 * @param {string} checkInDate
 * @param {string} checkOutDate
 * @returns {Promise<number>} totalPrice
 */
async function computeTotalPrice(rooms, checkInDate, checkOutDate) {
  const roomIds = rooms.map((r) => r.roomId);
  const quantityByRoom = new Map(rooms.map((r) => [r.roomId, r.quantity ?? 1]));

  const inventories = await roomInventoryRepository.findByRoomsAndDateRange(
    roomIds,
    checkInDate,
    checkOutDate
  );

  let total = 0;
  const priceByRoomDate = new Map();
  for (const inv of inventories) {
    const key = `${inv.room_id}_${(inv.date.toISOString ? inv.date.toISOString() : inv.date).split('T')[0]}`;
    const price = parseFloat(inv.price_per_night) || 0;
    priceByRoomDate.set(key, price);
  }

  const start = typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
  const end = typeof checkOutDate === 'string' ? new Date(checkOutDate) : checkOutDate;
  const current = new Date(start);

  while (current < end) {
    const dateStr = current.toISOString().split('T')[0];
    for (const r of rooms) {
      const qty = r.quantity ?? 1;
      const key = `${r.roomId}_${dateStr}`;
      const price = priceByRoomDate.get(key) || 0;
      total += price * qty;
    }
    current.setDate(current.getDate() + 1);
  }

  return Math.round(total * 100) / 100;
}

/**
 * Hold Service
 * Creates temporary room holds during checkout; releases on cancel or expiry
 */
class HoldService {
  /**
   * Create a hold for the given rooms and dates
   * @param {Object} data
   * @param {string} data.userId - User UUID
   * @param {string} data.hotelId - Hotel UUID
   * @param {string} data.checkInDate - YYYY-MM-DD
   * @param {string} data.checkOutDate - YYYY-MM-DD
   * @param {number} data.numberOfGuests
   * @param {Array<{roomId: string, quantity: number}>} data.rooms
   * @param {string} [data.currency] - Default USD
   * @returns {Promise<Object>} { holdId, expiresAt, status, ... }
   */
  async createHold(data) {
    const {
      userId,
      hotelId,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      rooms,
      currency = 'USD',
    } = data;

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      throw new ApiError(
        400,
        'INVALID_ROOMS',
        'rooms must be a non-empty array of { roomId, quantity }'
      );
    }

    const startDate = typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
    const endDate = typeof checkOutDate === 'string' ? new Date(checkOutDate) : checkOutDate;
    if (startDate >= endDate) {
      throw new ApiError(400, 'INVALID_DATE_RANGE', 'checkOutDate must be after checkInDate');
    }

    // const existing = await redisClient.get(`user_holds:${userId}`);
    // if (existing)
    //   throw new ApiError(
    //     409,
    //     'ACTIVE_HOLD_EXISTS',
    //     'You already have an active hold'
    //   );

    // Check room availability (total_rooms - booked_rooms - held_rooms >= quantity)
    const available = await inventoryService.checkAvailabilityForHold({
      rooms,
      checkInDate,
      checkOutDate,
    });
    if (!available) {
      throw new ApiError(
        409,
        'ROOMS_NOT_AVAILABLE',
        'Selected rooms are not available for the given dates'
      );
    }

    const totalPrice = await computeTotalPrice(rooms, checkInDate, checkOutDate);
    const expiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);

    const transaction = await sequelize.transaction();
    try {
      const { hold, holdRooms } = await holdRepository.create(
        {
          userId,
          hotelId,
          checkInDate:
            typeof checkInDate === 'string' ? checkInDate : checkInDate.toISOString().split('T')[0],
          checkOutDate:
            typeof checkOutDate === 'string'
              ? checkOutDate
              : checkOutDate.toISOString().split('T')[0],
          numberOfGuests: numberOfGuests ?? 1,
          totalPrice,
          currency,
          expiresAt,
          rooms: rooms.map((r) => ({
            roomId: r.roomId,
            quantity: r.quantity ?? 1,
          })),
        },
        { transaction }
      );

      await inventoryService.holdRooms(
        {
          rooms: holdRooms.map((hr) => ({
            roomId: hr.room_id,
            quantity: hr.quantity,
          })),
          checkInDate: hold.check_in_date,
          checkOutDate: hold.check_out_date,
        },
        { transaction }
      );

      await transaction.commit();

      // await redisClient.set(`user_holds:${userId}`, hold.id, 'EX', 900);
      // await scheduleExpireHold(hold);

      logger.info('Hold created', {
        holdId: hold.id,
        userId,
        hotelId,
        expiresAt: hold.expires_at,
      });

      return {
        holdId: hold.id,
        checkInDate: hold.check_in_date,
        checkOutDate: hold.check_out_date,
        numberOfGuests: hold.number_of_guests,
        quantity: hold.quantity,
        totalPrice: parseFloat(hold.total_price),
        currency: hold.currency,
        status: hold.status,
        expiresAt: hold.expires_at,
        rooms: holdRooms.map((hr) => ({
          roomId: hr.room_id,
          quantity: hr.quantity,
        })),
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof ApiError) throw error;
      logger.error('Create hold failed:', error);
      throw new ApiError(500, 'CREATE_HOLD_FAILED', 'Failed to create hold', {
        originalError: error.message,
      });
    }
  }

  /**
   * Get hold by ID; ensure user owns it if userId provided
   */
  async getHold(holdId, userId = null) {
    // await getHoldFromCache(holdId);
    const hold = await holdRepository.findByIdWithRooms(holdId);
    if (!hold) {
      throw new ApiError(404, 'HOLD_NOT_FOUND', 'Hold not found');
    }
    if (userId && hold.user_id !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to view this hold');
    }
    const h = hold.toJSON ? hold.toJSON() : hold;
    return {
      ...h,
      totalPrice: parseFloat(h.total_price),
      isExpired: new Date(h.expires_at) <= new Date() || h.status !== 'active',
    };
  }

  /**
   * Get active holds for a user
   */
  async getActiveHoldsByUser(userId) {
    const holds = await holdRepository.findActiveByUserId(userId);
    return holds.map((hold) => {
      const h = hold.toJSON ? hold.toJSON() : hold;
      return {
        ...h,
        totalPrice: parseFloat(h.total_price),
        expiresAt: h.expires_at,
      };
    });
  }

  /**
   * Release a hold (user cancels checkout, hold expired, or converted to booking).
   * Decrements held_rooms and updates hold status.
   * @param {string} holdId - Hold ID
   * @param {string} userId - User ID (must own the hold)
   * @param {string} reason - 'released' | 'expired' | 'completed'
   * @param {Object} [options] - Optional. If options.transaction is provided, runs inside that transaction (caller commits); otherwise starts its own transaction.
   */
  async releaseHold(holdId, userId, reason = 'released', options = {}) {
    const hold = await holdRepository.findByIdWithRooms(holdId);
    if (!hold) {
      throw new ApiError(404, 'HOLD_NOT_FOUND', 'Hold not found');
    }
    if (hold.user_id !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to release this hold');
    }
    if (hold.status !== 'active') {
      throw new ApiError(400, 'HOLD_NOT_ACTIVE', `Hold is already ${hold.status}`);
    }

    const statusByReason = {
      expired: 'expired',
      released: 'released',
      completed: 'completed',
    };
    const newStatus = statusByReason[reason] || 'released';

    const useExternalTransaction = !!options.transaction;
    const transaction = options.transaction || (await sequelize.transaction());

    try {
      await inventoryService.releaseHoldRooms(
        {
          rooms: (hold.holdRooms || []).map((hr) => ({
            roomId: hr.room_id,
            quantity: hr.quantity,
          })),
          checkInDate: hold.check_in_date,
          checkOutDate: hold.check_out_date,
        },
        { transaction }
      );

      await holdRepository.updateStatus(
        holdId,
        {
          status: newStatus,
          released_at: new Date(),
        },
        { transaction }
      );

      if (!useExternalTransaction) {
        await transaction.commit();
      }

      logger.info('Hold released', { holdId, userId, reason });
      return { holdId, status: newStatus };
    } catch (error) {
      if (!useExternalTransaction) {
        await transaction.rollback();
      }
      if (error instanceof ApiError) throw error;
      logger.error('Release hold failed:', error);
      throw new ApiError(500, 'RELEASE_HOLD_FAILED', 'Failed to release hold', {
        originalError: error.message,
      });
    }
  }

  /**
   * Release expired holds (to be called by a cron job or BullMQ worker)
   * Finds holds with status=active and expires_at <= now, releases them
   */
  async releaseExpiredHolds() {
    const expired = await holdRepository.findExpiredActive();
    let released = 0;
    for (const hold of expired) {
      try {
        await this.releaseHold(hold.id, hold.user_id, 'expired');
        released++;
      } catch (err) {
        logger.error('Failed to release expired hold', {
          holdId: hold.id,
          error: err.message,
        });
      }
    }
    return { processed: expired.length, released };
  }
}

module.exports = new HoldService();
