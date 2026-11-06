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
} = require('@platform/database');

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

// Statuses that still hold rooms (used by the calendar/board).
const BOARD_STATUSES = ['pending', 'pending_payment', 'confirmed', 'checked_in'];
const CALENDAR_STATUSES = [...BOARD_STATUSES, 'completed'];

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

  /** Bookings created per day over the last `days` days (for the dashboard trend). */
  async getDailyCounts(hotelId, { days = 14 } = {}) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const dateExpr = fn('DATE', col('created_at'));

    return await Bookings.findAll({
      attributes: [
        [dateExpr, 'date'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { hotel_id: hotelId, created_at: { [Op.gte]: since } },
      group: [dateExpr],
      order: [[dateExpr, 'ASC']],
      raw: true,
    });
  }

  async countWhere(hotelId, where = {}, options = {}) {
    return await Bookings.count({ where: { hotel_id: hotelId, ...where }, ...options });
  }

  /**
   * Bookings overlapping a date range, for the reservations calendar grid.
   * Uses the half-open rule: check_in < endDate && check_out > startDate.
   */
  async findCalendar({ hotelId, startDate, endDate }) {
    return await Bookings.findAll({
      where: {
        hotel_id: hotelId,
        status: { [Op.in]: CALENDAR_STATUSES },
        check_in_date: { [Op.lt]: endDate },
        check_out_date: { [Op.gt]: startDate },
      },
      include: LIST_INCLUDE,
      order: [
        ['check_in_date', 'ASC'],
        ['created_at', 'ASC'],
      ],
    });
  }

  /** Arrivals / departures / in-house for a single day (front-desk board). */
  async findBoard({ hotelId, date }) {
    const [arrivals, departures, inHouse] = await Promise.all([
      Bookings.findAll({
        where: {
          hotel_id: hotelId,
          check_in_date: date,
          status: { [Op.in]: BOARD_STATUSES },
        },
        include: LIST_INCLUDE,
        order: [['created_at', 'ASC']],
      }),
      Bookings.findAll({
        where: {
          hotel_id: hotelId,
          check_out_date: date,
          status: { [Op.in]: [...BOARD_STATUSES, 'completed'] },
        },
        include: LIST_INCLUDE,
        order: [['created_at', 'ASC']],
      }),
      Bookings.findAll({
        where: {
          hotel_id: hotelId,
          check_in_date: { [Op.lte]: date },
          check_out_date: { [Op.gt]: date },
          status: { [Op.in]: BOARD_STATUSES },
        },
        include: LIST_INCLUDE,
        order: [['check_in_date', 'ASC']],
      }),
    ]);

    return { arrivals, departures, inHouse };
  }
}

module.exports = new BookingAdminRepository();
