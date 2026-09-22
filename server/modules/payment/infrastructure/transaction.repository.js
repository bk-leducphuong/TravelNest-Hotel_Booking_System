const { Op } = require('sequelize');

const {
  transactions: Transactions,
  payments: Payments,
  refunds: Refunds,
  bookings: Bookings,
  hotels: Hotels,
  users: Users,
} = require('@models/index.js');

/**
 * Payment module transaction repository.
 * Owns reads/writes of the `transactions` table for the admin surface.
 */

const DETAIL_INCLUDE = [
  {
    model: Payments,
    as: 'payments',
    attributes: [
      'id',
      'payment_method',
      'payment_status',
      'amount',
      'currency',
      'card_brand',
      'card_last4',
      'paid_at',
    ],
    required: false,
  },
  {
    model: Refunds,
    as: 'refunds',
    attributes: [
      'id',
      'amount',
      'currency',
      'status',
      'reason',
      'provider_refund_id',
      'processed_at',
    ],
    required: false,
  },
  {
    model: Bookings,
    as: 'booking',
    attributes: ['id', 'booking_code', 'check_in_date', 'check_out_date', 'status'],
    required: false,
  },
  { model: Hotels, as: 'hotel', attributes: ['id', 'name'], required: false },
  {
    model: Users,
    as: 'transaction_buyer',
    attributes: ['id', 'first_name', 'last_name', 'email'],
    required: false,
  },
];

class TransactionRepository {
  async findById(transactionId, options = {}) {
    return await Transactions.findOne({ where: { id: transactionId }, ...options });
  }

  async findByBookingId(bookingId, options = {}) {
    return await Transactions.findOne({
      where: { booking_id: bookingId, transaction_type: 'payment' },
      order: [['created_at', 'DESC']],
      ...options,
    });
  }

  async findByIdWithRelations(transactionId, options = {}) {
    return await Transactions.findOne({
      where: { id: transactionId },
      include: DETAIL_INCLUDE,
      ...options,
    });
  }

  async findForHotel({
    hotelId,
    status,
    transactionType,
    bookingId,
    buyerId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = {}) {
    const where = {};

    if (hotelId) where.hotel_id = hotelId;
    if (status) where.status = status;
    if (transactionType) where.transaction_type = transactionType;
    if (bookingId) where.booking_id = bookingId;
    if (buyerId) where.buyer_id = buyerId;
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = dateFrom;
      if (dateTo) where.created_at[Op.lte] = dateTo;
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    return await Transactions.findAndCountAll({
      where,
      include: [
        {
          model: Bookings,
          as: 'booking',
          attributes: ['id', 'booking_code', 'status'],
          required: false,
        },
        { model: Hotels, as: 'hotel', attributes: ['id', 'name'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    });
  }

  async updateStatus(transactionId, status, options = {}) {
    return await Transactions.update({ status }, { where: { id: transactionId }, ...options });
  }

  async getHotelSummary(hotelId) {
    return await Transactions.findAll({
      where: { hotel_id: hotelId },
      attributes: ['status', 'amount', 'currency'],
      raw: true,
    });
  }
}

module.exports = new TransactionRepository();
