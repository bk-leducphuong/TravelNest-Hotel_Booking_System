const { Op } = require('sequelize');

const { Transactions, Bookings, Hotels, Payments } = require('@models/index.js');
const logger = require('@config/logger.config');

/**
 * Transaction read queries.
 */

async function findById(transactionId, options = {}) {
  try {
    return await Transactions.findOne({
      where: { id: transactionId },
      include: options.include || [],
      ...options,
    });
  } catch (error) {
    logger.error('Error finding transaction by ID:', error);
    throw error;
  }
}

async function findByPaymentIntentId(paymentIntentId, options = {}) {
  try {
    return await Transactions.findOne({
      where: { stripe_payment_intent_id: paymentIntentId },
      include: options.include || [],
      ...options,
    });
  } catch (error) {
    logger.error('Error finding transaction by payment intent ID:', error);
    throw error;
  }
}

async function findByChargeId(chargeId, options = {}) {
  try {
    return await Transactions.findOne({
      where: { stripe_charge_id: chargeId },
      include: options.include || [],
      ...options,
    });
  } catch (error) {
    logger.error('Error finding transaction by charge ID:', error);
    throw error;
  }
}

async function findByBookingId(bookingId, options = {}) {
  try {
    return await Transactions.findOne({
      where: { booking_id: bookingId },
      include: options.include || [],
      ...options,
    });
  } catch (error) {
    logger.error('Error finding transaction by booking ID:', error);
    throw error;
  }
}

async function findByBuyerId(buyerId, options = {}) {
  try {
    const { limit, offset, include, order, ...restOptions } = options;

    return await Transactions.findAndCountAll({
      where: { buyer_id: buyerId },
      include: include || [
        {
          model: Payments,
          as: 'payments',
          attributes: ['id', 'payment_method', 'payment_status', 'amount', 'currency', 'paid_at'],
        },
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['id', 'name', 'city', 'country'],
        },
        {
          model: Bookings,
          as: 'booking',
          attributes: ['id', 'booking_code', 'check_in_date', 'check_out_date'],
        },
      ],
      limit: limit || undefined,
      offset: offset || undefined,
      order: order || [['created_at', 'DESC']],
      ...restOptions,
    });
  } catch (error) {
    logger.error('Error finding transactions by buyer ID:', error);
    throw error;
  }
}

async function findByHotelId(hotelId, options = {}) {
  try {
    const { limit, offset, include, order, ...restOptions } = options;

    return await Transactions.findAndCountAll({
      where: { hotel_id: hotelId },
      include: include || [],
      limit: limit || undefined,
      offset: offset || undefined,
      order: order || [['created_at', 'DESC']],
      ...restOptions,
    });
  } catch (error) {
    logger.error('Error finding transactions by hotel ID:', error);
    throw error;
  }
}

async function findByStatus(status, options = {}) {
  try {
    const { limit, offset, include, order, ...restOptions } = options;

    return await Transactions.findAndCountAll({
      where: { status },
      include: include || [],
      limit: limit || undefined,
      offset: offset || undefined,
      order: order || [['created_at', 'DESC']],
      ...restOptions,
    });
  } catch (error) {
    logger.error('Error finding transactions by status:', error);
    throw error;
  }
}

async function findAll(filters = {}, options = {}) {
  try {
    const { page, limit: limitOption, offset, include, order, ...restOptions } = options;

    const where = {};
    if (filters.buyerId) where.buyer_id = filters.buyerId;
    if (filters.hotelId) where.hotel_id = filters.hotelId;
    if (filters.status) where.status = filters.status;
    if (filters.transactionType) where.transaction_type = filters.transactionType;
    if (filters.paymentIntentId) where.stripe_payment_intent_id = filters.paymentIntentId;
    if (filters.dateFrom || filters.dateTo) {
      where.created_at = {};
      if (filters.dateFrom) where.created_at[Op.gte] = filters.dateFrom;
      if (filters.dateTo) where.created_at[Op.lte] = filters.dateTo;
    }

    const calculatedLimit = limitOption || (page ? 20 : undefined);
    const calculatedOffset = offset || (page ? (page - 1) * calculatedLimit : undefined);

    return await Transactions.findAndCountAll({
      where,
      include: include || [],
      limit: calculatedLimit,
      offset: calculatedOffset,
      order: order || [['created_at', 'DESC']],
      ...restOptions,
    });
  } catch (error) {
    logger.error('Error finding transactions:', error);
    throw error;
  }
}

module.exports = {
  findById,
  findByPaymentIntentId,
  findByChargeId,
  findByBookingId,
  findByBuyerId,
  findByHotelId,
  findByStatus,
  findAll,
};
