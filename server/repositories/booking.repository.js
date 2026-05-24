const { Op } = require('sequelize');

const {
  Bookings,
  BookingRooms,
  Cities,
  Hotels,
  Images,
  Rooms,
  Transactions,
  Refunds,
  HotelCancellationRules,
} = require('../models/index.js');
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
      include: options.include || [],
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

  async findExpiredPending(options = {}) {
    const { limit = 100, order = [['expires_at', 'ASC']], ...queryOptions } = options;

    return await Bookings.findAll({
      where: {
        status: {
          [Op.in]: ['pending', 'pending_payment'],
        },
        expires_at: {
          [Op.ne]: null,
          [Op.lte]: new Date(),
        },
      },
      limit,
      order,
      ...queryOptions,
    });
  }

  async findExpiryContextById(bookingId, options = {}) {
    return await Bookings.findOne({
      where: { id: bookingId },
      include: [
        {
          model: BookingRooms,
          as: 'bookingRooms',
        },
        {
          model: Transactions,
          as: 'transaction',
        },
      ],
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
      include: [
        {
          model: BookingRooms,
          as: 'bookingRooms',
          include: [{ model: Rooms, as: 'room', attributes: ['id', 'room_name'] }],
        },
        {
          model: Transactions,
          as: 'transaction',
        },
      ],
    });
  }

  /**
   * Find booking with hotel timing fields needed for cancellation policy evaluation
   */
  async findCancellationContextByIdAndBuyerId(bookingId, buyerId) {
    return await Bookings.findOne({
      where: {
        id: bookingId,
        buyer_id: buyerId,
      },
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['id', 'timezone', 'check_in_time'],
        },
      ],
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
   * Updates status to 'checked_in' or 'completed' based on current date
   */
  async updateStatusByDates(buyerId) {
    return await Bookings.update(
      {
        status: sequelize.literal(`CASE
          WHEN (CURRENT_DATE() BETWEEN check_in_date AND check_out_date) THEN 'checked_in'
          WHEN CURRENT_DATE() > check_out_date THEN 'completed'
          ELSE status
          END`),
      },
      {
        where: {
          buyer_id: buyerId,
          status: {
            [Op.in]: ['confirmed', 'checked_in'],
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
      attributes: ['id', 'name', 'city_id'],
      include: [
        {
          model: Cities,
          as: 'city',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: Images,
          as: 'images',
          where: { status: 'active' },
          attributes: ['id', 'object_key', 'is_primary', 'display_order'],
          required: false,
        },
      ],
      order: [
        [{ model: Images, as: 'images' }, 'is_primary', 'DESC'],
        [{ model: Images, as: 'images' }, 'display_order', 'ASC'],
      ],
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

  async createBookingRoom(roomData, options = {}) {
    return await BookingRooms.create(
      {
        booking_id: roomData.bookingId || roomData.booking_id,
        room_id: roomData.roomId || roomData.room_id,
        quantity: roomData.quantity || 1,
        nightly_price_snapshot: roomData.nightlyPriceSnapshot || roomData.nightly_price_snapshot,
        subtotal: roomData.subtotal || 0,
        total_price: roomData.totalPrice || roomData.total_price || roomData.subtotal || 0,
      },
      options
    );
  }

  async bulkCreateBookingRooms(rooms, options = {}) {
    return await BookingRooms.bulkCreate(
      rooms.map((room) => ({
        booking_id: room.bookingId || room.booking_id,
        room_id: room.roomId || room.room_id,
        quantity: room.quantity || 1,
        nightly_price_snapshot: room.nightlyPriceSnapshot || room.nightly_price_snapshot,
        subtotal: room.subtotal || 0,
        total_price: room.totalPrice || room.total_price || room.subtotal || 0,
      })),
      options
    );
  }

  /**
   * Find transaction by booking ID
   */
  async findTransactionByBookingId(bookingId) {
    return await Transactions.findOne({
      where: { booking_id: bookingId },
      attributes: [
        'id',
        'amount',
        'currency',
        'status',
        'stripe_charge_id',
        'stripe_payment_intent_id',
      ],
    });
  }

  /**
   * Find the most specific active cancellation rule for a hotel/room.
   * Room-specific rule wins over hotel-wide default.
   */
  async findCancellationRule(hotelId, roomId) {
    return await HotelCancellationRules.findOne({
      where: {
        hotel_id: hotelId,
        is_active: true,
        [Op.or]: [{ room_id: roomId }, { room_id: null }],
      },
      order: [
        [sequelize.literal(`CASE WHEN room_id IS NULL THEN 1 ELSE 0 END`), 'ASC'],
        ['updated_at', 'DESC'],
      ],
    });
  }

  /**
   * Create refund record
   */
  async createRefund(refundData, options = {}) {
    return await Refunds.create(
      {
        booking_id: refundData.bookingId,
        transaction_id: refundData.transactionId,
        buyer_id: refundData.buyerId,
        hotel_id: refundData.hotelId,
        provider: refundData.provider || 'stripe',
        provider_refund_id: refundData.providerRefundId,
        amount: refundData.amount,
        currency: refundData.currency || 'USD',
        status: refundData.status || 'pending',
        reason: refundData.reason || 'customer_request',
        eligibility: refundData.eligibility || 'manual_review',
        free_cancellation_deadline: refundData.freeCancellationDeadline,
        requested_at: refundData.requestedAt,
        processed_at: refundData.processedAt,
        failure_code: refundData.failureCode,
        failure_message: refundData.failureMessage,
        metadata: refundData.metadata,
      },
      options
    );
  }

  /**
   * Update refund record
   */
  async updateRefund(refundId, updateData, options = {}) {
    const mappedData = {};
    if (updateData.providerRefundId !== undefined)
      mappedData.provider_refund_id = updateData.providerRefundId;
    if (updateData.status !== undefined) mappedData.status = updateData.status;
    if (updateData.processedAt !== undefined) mappedData.processed_at = updateData.processedAt;
    if (updateData.failureCode !== undefined) mappedData.failure_code = updateData.failureCode;
    if (updateData.failureMessage !== undefined)
      mappedData.failure_message = updateData.failureMessage;
    if (updateData.metadata !== undefined) mappedData.metadata = updateData.metadata;

    return await Refunds.update(mappedData, {
      where: { id: refundId },
      ...options,
    });
  }

  /**
   * Update transaction refund state
   */
  async updateTransactionRefundState(transactionId, updateData, options = {}) {
    const mappedData = {};
    if (updateData.status !== undefined) mappedData.status = updateData.status;
    if (updateData.refundId !== undefined) mappedData.stripe_refund_id = updateData.refundId;
    if (updateData.completedAt !== undefined) mappedData.completed_at = updateData.completedAt;

    return await Transactions.update(mappedData, {
      where: { id: transactionId },
      ...options,
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
          as: 'hotel',
          attributes: ['id', 'name', 'city_id'],
          include: [
            {
              model: Cities,
              as: 'city',
              attributes: ['id', 'name'],
              required: false,
            },
            {
              model: Images,
              as: 'images',
              where: { status: 'active' },
              attributes: ['id', 'object_key', 'is_primary', 'display_order'],
              required: false,
            },
          ],
        },
        {
          model: Rooms,
          as: 'room',
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

  async update(bookingId, updateData, options = {}) {
    return await Bookings.update(updateData, {
      where: { id: bookingId },
      ...options,
    });
  }

  async findPaymentContextByIdAndBuyerId(bookingId, buyerId, options = {}) {
    return await Bookings.findOne({
      where: {
        id: bookingId,
        buyer_id: buyerId,
      },
      include: [
        {
          model: BookingRooms,
          as: 'bookingRooms',
        },
        {
          model: Transactions,
          as: 'transaction',
        },
      ],
      ...options,
    });
  }

  async findDetailedByBookingCodeAndBuyerId(bookingCode, buyerId, options = {}) {
    return await Bookings.findOne({
      where: {
        booking_code: bookingCode,
        buyer_id: buyerId,
      },
      include: [
        {
          model: BookingRooms,
          as: 'bookingRooms',
          include: [{ model: Rooms, as: 'room', attributes: ['id', 'room_name'] }],
        },
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['id', 'name', 'city_id', 'address'],
        },
        {
          model: Transactions,
          as: 'transaction',
        },
      ],
      ...options,
    });
  }
}

module.exports = new BookingRepository();
