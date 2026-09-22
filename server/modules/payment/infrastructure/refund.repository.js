const { Op, fn, col } = require('sequelize');

const {
  refunds: Refunds,
  transactions: Transactions,
  bookings: Bookings,
  hotels: Hotels,
  users: Users,
} = require('@models/index.js');

const { ACTIVE_REFUND_STATUSES } = require('../domain/refund-rules');

/**
 * Payment module refund repository.
 * Owns reads/writes of the `refunds` table for the admin surface.
 */

const DETAIL_INCLUDE = [
  {
    model: Transactions,
    as: 'transaction',
    attributes: [
      'id',
      'booking_id',
      'buyer_id',
      'hotel_id',
      'amount',
      'currency',
      'status',
      'transaction_type',
      'stripe_charge_id',
      'stripe_payment_intent_id',
    ],
    required: false,
  },
  {
    model: Bookings,
    as: 'booking',
    attributes: ['id', 'booking_code', 'status'],
    required: false,
  },
  { model: Hotels, as: 'hotel', attributes: ['id', 'name'], required: false },
  {
    model: Users,
    as: 'buyer',
    attributes: ['id', 'first_name', 'last_name', 'email'],
    required: false,
  },
];

const UPDATABLE_FIELDS = {
  providerRefundId: 'provider_refund_id',
  provider_refund_id: 'provider_refund_id',
  status: 'status',
  processedAt: 'processed_at',
  processed_at: 'processed_at',
  failureCode: 'failure_code',
  failure_code: 'failure_code',
  failureMessage: 'failure_message',
  failure_message: 'failure_message',
  metadata: 'metadata',
};

class RefundRepository {
  async create(data, options = {}) {
    return await Refunds.create(
      {
        booking_id: data.bookingId,
        transaction_id: data.transactionId,
        buyer_id: data.buyerId,
        hotel_id: data.hotelId,
        provider: data.provider || 'stripe',
        provider_refund_id: data.providerRefundId || null,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: data.status || 'pending',
        reason: data.reason || 'customer_request',
        eligibility: data.eligibility || 'manual_review',
        processed_at: data.processedAt || null,
        failure_code: data.failureCode || null,
        failure_message: data.failureMessage || null,
        metadata: data.metadata || null,
      },
      options
    );
  }

  async findById(refundId, options = {}) {
    return await Refunds.findOne({ where: { id: refundId }, ...options });
  }

  async findByIdWithRelations(refundId, options = {}) {
    return await Refunds.findOne({
      where: { id: refundId },
      include: DETAIL_INCLUDE,
      ...options,
    });
  }

  async findByProviderRefundId(providerRefundId, options = {}) {
    return await Refunds.findOne({
      where: { provider_refund_id: providerRefundId },
      ...options,
    });
  }

  async findForHotel({
    hotelId,
    status,
    transactionId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = {}) {
    const where = {};

    if (hotelId) where.hotel_id = hotelId;
    if (status) where.status = status;
    if (transactionId) where.transaction_id = transactionId;
    if (dateFrom || dateTo) {
      where.requested_at = {};
      if (dateFrom) where.requested_at[Op.gte] = dateFrom;
      if (dateTo) where.requested_at[Op.lte] = dateTo;
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    return await Refunds.findAndCountAll({
      where,
      include: DETAIL_INCLUDE,
      order: [['requested_at', 'DESC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
      distinct: true,
    });
  }

  async update(refundId, updateData, options = {}) {
    const mapped = {};

    for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
      if (updateData[key] !== undefined) {
        mapped[column] = updateData[key];
      }
    }

    if (Object.keys(mapped).length === 0) {
      return [0];
    }

    return await Refunds.update(mapped, { where: { id: refundId }, ...options });
  }

  async sumActiveForTransaction(transactionId, options = {}) {
    const result = await Refunds.findOne({
      attributes: [[fn('SUM', col('amount')), 'total']],
      where: { transaction_id: transactionId, status: { [Op.in]: ACTIVE_REFUND_STATUSES } },
      raw: true,
      ...options,
    });

    return result?.total ? parseFloat(result.total) : 0;
  }

  async sumSucceededForTransaction(transactionId, options = {}) {
    const result = await Refunds.findOne({
      attributes: [[fn('SUM', col('amount')), 'total']],
      where: { transaction_id: transactionId, status: 'succeeded' },
      raw: true,
      ...options,
    });

    return result?.total ? parseFloat(result.total) : 0;
  }

  async findActiveForTransaction(transactionId, options = {}) {
    return await Refunds.findOne({
      where: {
        transaction_id: transactionId,
        status: { [Op.in]: ['pending', 'processing'] },
      },
      ...options,
    });
  }

  async sumSucceededForHotel(hotelId, options = {}) {
    const result = await Refunds.findOne({
      attributes: [[fn('SUM', col('amount')), 'total']],
      where: { hotel_id: hotelId, status: 'succeeded' },
      raw: true,
      ...options,
    });

    return result?.total ? parseFloat(result.total) : 0;
  }
}

module.exports = new RefundRepository();
