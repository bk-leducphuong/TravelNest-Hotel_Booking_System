const { Op, fn, col } = require('sequelize');

const {
  bookings: Bookings,
  booking_rooms: BookingRooms,
  rooms: Rooms,
  users: Users,
  hotels: Hotels,
  transactions: Transactions,
  payments: Payments,
  refunds: Refunds,
} = require('@models/index.js');

/**
 * Booking module (admin) repository. Owns booking reads/writes for the
 * back-office surface.
 */

const LIST_INCLUDE = [
  {
    model: Users,
    as: 'buyer',
    attributes: ['id', 'first_name', 'last_name', 'email'],
    required: false,
  },
  { model: Rooms, as: 'room', attributes: ['id', 'room_name'], required: false },
  { model: Hotels, as: 'hotel', attributes: ['id', 'name'], required: false },
];

const DETAIL_INCLUDE = [
  ...LIST_INCLUDE,
  {
    model: BookingRooms,
    as: 'bookingRooms',
    required: false,
    include: [{ model: Rooms, as: 'room', attributes: ['id', 'room_name'], required: false }],
  },
  {
    model: Transactions,
    as: 'transaction',
    required: false,
    include: [
      {
        model: Payments,
        as: 'payments',
        attributes: ['id', 'payment_status', 'amount', 'currency', 'card_brand', 'card_last4'],
        required: false,
      },
      {
        model: Refunds,
        as: 'refunds',
        attributes: ['id', 'amount', 'currency', 'status', 'reason', 'processed_at'],
        required: false,
      },
    ],
  },
];

class BookingAdminRepository {
  async findForHotel({
    hotelId,
    status,
    bookingCode,
    roomId,
    buyerId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = {}) {
    const where = {};

    if (hotelId) where.hotel_id = hotelId;
    if (status) where.status = status;
    if (bookingCode) where.booking_code = bookingCode;
    if (roomId) where.room_id = roomId;
    if (buyerId) where.buyer_id = buyerId;
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = dateFrom;
      if (dateTo) where.created_at[Op.lte] = dateTo;
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    return await Bookings.findAndCountAll({
      where,
      include: LIST_INCLUDE,
      order: [['created_at', 'DESC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
      distinct: true,
    });
  }

  async findByIdWithRelations(bookingId, options = {}) {
    return await Bookings.findOne({
      where: { id: bookingId },
      include: DETAIL_INCLUDE,
      ...options,
    });
  }

  async findById(bookingId, options = {}) {
    return await Bookings.findOne({ where: { id: bookingId }, ...options });
  }

  async update(bookingId, values, options = {}) {
    return await Bookings.update(
      { ...values, updated_at: new Date() },
      {
        where: { id: bookingId },
        ...options,
      }
    );
  }

  async getStatusCounts(hotelId, options = {}) {
    return await Bookings.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      where: { hotel_id: hotelId },
      group: ['status'],
      raw: true,
      ...options,
    });
  }

  async countWhere(hotelId, where = {}, options = {}) {
    return await Bookings.count({ where: { hotel_id: hotelId, ...where }, ...options });
  }
}

module.exports = new BookingAdminRepository();
