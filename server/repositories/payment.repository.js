const { Op } = require('sequelize');

const { Transactions, Payments, Bookings, Hotels } = require('../models/index.js');

/**
 * Payment Repository - Contains all database operations for payments
 * Only repositories may import Sequelize models
 */

class PaymentRepository {
  /**
   * Create a transaction
   */
  async createTransaction(transactionData) {
    return await Transactions.create({
      buyer_id: transactionData.buyerId,
      amount: transactionData.amount,
      currency: transactionData.currency,
      status: transactionData.status || 'pending',
      transaction_type: transactionData.transactionType || 'booking_payment',
      payment_intent_id: transactionData.paymentIntentId,
      charge_id: transactionData.chargeId,
      booking_code: transactionData.bookingCode,
      hotel_id: transactionData.hotelId,
    });
  }

  /**
   * Find transaction by payment intent ID
   */
  async findTransactionByPaymentIntentId(paymentIntentId) {
    return await Transactions.findOne({
      where: { payment_intent_id: paymentIntentId },
    });
  }

  /**
   * Find transaction by booking code
   */
  async findTransactionByBookingCode(bookingCode) {
    return await Transactions.findOne({
      where: { booking_code: bookingCode },
    });
  }

  /**
   * Find transaction by ID
   */
  async findTransactionById(transactionId) {
    return await Transactions.findOne({
      where: { transaction_id: transactionId },
    });
  }

  /**
   * Update transaction by ID
   */
  async updateTransactionById(transactionId, updateData) {
    return await Transactions.update(updateData, {
      where: { transaction_id: transactionId },
    });
  }

  /**
   * Create a payment record
   */
  async createPayment(paymentData) {
    return await Payments.create({
      transaction_id: paymentData.transactionId,
      payment_method: paymentData.paymentMethod,
      payment_status: paymentData.paymentStatus || 'pending',
      amount: paymentData.amount,
      currency: paymentData.currency,
      paid_at: paymentData.paidAt,
    });
  }

  /**
   * Find payment by transaction ID
   */
  async findPaymentByTransactionId(transactionId) {
    return await Payments.findOne({
      where: { transaction_id: transactionId },
    });
  }

  /**
   * Find payments by buyer ID
   */
  async findPaymentsByBuyerId(buyerId, options = {}) {
    const { limit, offset } = options;

    return await Transactions.findAndCountAll({
      where: { buyer_id: buyerId },
      include: [
        {
          model: Payments,
          attributes: [
            'payment_id',
            'payment_method',
            'payment_status',
            'amount',
            'currency',
            'paid_at',
          ],
        },
        {
          model: Hotels,
          attributes: ['id', 'name', 'city'],
        },
      ],
      limit: limit || undefined,
      offset: offset || undefined,
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Find payment by booking ID
   */
  async findPaymentByBookingId(bookingId) {
    const booking = await Bookings.findOne({
      where: { id: bookingId },
      attributes: ['booking_code'],
    });

    if (!booking) {
      return null;
    }

    return await Transactions.findOne({
      where: { booking_code: booking.booking_code },
      include: [
        {
          model: Payments,
          attributes: [
            'payment_id',
            'payment_method',
            'payment_status',
            'amount',
            'currency',
            'paid_at',
          ],
        },
        {
          model: Hotels,
          attributes: ['id', 'name', 'city'],
        },
      ],
    });
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(transactionId, paymentStatus) {
    return await Payments.update(
      { payment_status: paymentStatus },
      {
        where: { transaction_id: transactionId },
      }
    );
  }
}

module.exports = new PaymentRepository();
