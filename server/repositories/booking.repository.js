const { Op } = require('sequelize');

const { Bookings, Hotels, Rooms, Transactions, Refunds } = require('../models/index.js');
const sequelize = require('../config/database.config');

/**
 * Booking Repository - Contains all database operations for bookings
 * Only repositories may import Sequelize models
 */

class BookingRepository {
  /**
   * Find all bookings by buyer ID
   */
  async findByBuyerId(buyerId, options = {}) {
    const { excludeCancelled = true } = options;

    const where = {
      buyer_id: buyerId,
    };

    if (excludeCancelled) {
      where.status = {
        [Op.ne]: 'cancelled',
      };
    }

    return await Bookings.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Find booking by ID
   */
  async findById(bookingId) {
    return await Bookings.findOne({
      where: { id: bookingId },
    });
  }

  /**
   * Find booking by booking code (single record)
   */
  async findByBookingCode(bookingCode, options = {}) {
    return await Bookings.findOne({
      where: { booking_code: bookingCode },
      ...options,
    });
  }

  /**
   * Find all bookings by booking code (one code can have multiple rows for multiple rooms)
   */
  async findAllByBookingCode(bookingCode, options = {}) {
    return await Bookings.findAll({
      where: { booking_code: bookingCode },
      ...options,
    });
  }

  /**
   * Update all bookings with the given booking code
   */
  async updateByBookingCode(bookingCode, updateData, options = {}) {
    const [count] = await Bookings.update(updateData, {
      where: { booking_code: bookingCode },
      ...options,
    });
    return count;
  }

  /**
   * Find booking by ID with buyer ID check
   */
  async findByIdAndBuyerId(bookingId, buyerId) {
    return await Bookings.findOne({
      where: {
        id: bookingId,
        buyer_id: buyerId,
      },
    });
  }

  /**
   * Update booking status
   */
  async updateStatus(bookingId, status) {
    return await Bookings.update(
      { status },
      {
        where: { id: bookingId },
      }
    );
  }

  /**
   * Update multiple bookings status based on dates
   * Updates status to 'checked in' or 'completed' based on current date
   */
  async updateStatusByDates(buyerId) {
    return await Bookings.update(
      {
        status: sequelize.literal(`CASE
          WHEN (CURRENT_DATE() BETWEEN check_in_date AND check_out_date) THEN 'checked in'
          WHEN CURRENT_DATE() > check_out_date THEN 'completed'
          ELSE status
          END`),
      },
      {
        where: {
          buyer_id: buyerId,
          status: {
            [Op.ne]: 'cancelled',
          },
        },
      }
    );
  }

  /**
   * Find hotel by ID
   */
  async findHotelById(hotelId) {
    return await Hotels.findOne({
      where: { id: hotelId },
      attributes: ['id', 'name', 'city', 'image_urls'],
    });
  }

  /**
   * Find room by ID
   */
  async findRoomById(roomId) {
    return await Rooms.findOne({
      where: { id: roomId },
      attributes: ['id', 'room_name'],
    });
  }

  /**
   * Find transaction by booking code
   */
  async findTransactionByBookingCode(bookingCode) {
    return await Transactions.findOne({
      where: { booking_code: bookingCode },
      attributes: ['charge_id', 'amount', 'transaction_id'],
    });
  }

  /**
   * Create refund record
   */
  async createRefund(refundData) {
    return await Refunds.create({
      transaction_id: refundData.transactionId,
      buyer_id: refundData.buyerId,
      hotel_id: refundData.hotelId,
      amount: refundData.amount,
      status: refundData.status || 'pending',
    });
  }

  /**
   * Find booking with related hotel and room information
   */
  async findBookingWithDetails(bookingId) {
    return await Bookings.findOne({
      where: { id: bookingId },
      include: [
        {
          model: Hotels,
          attributes: ['id', 'name', 'city', 'image_urls'],
        },
        {
          model: Rooms,
          attributes: ['id', 'room_name'],
        },
      ],
    });
  }

  /**
   * Create a booking record
   * @param {Object} bookingData
   * @param {Object} options - Sequelize options (transaction, etc.)
   */
  async create(bookingData, options = {}) {
    return await Bookings.create(bookingData, options);
  }
}

module.exports = new BookingRepository();
