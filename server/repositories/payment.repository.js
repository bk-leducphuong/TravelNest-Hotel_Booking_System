const { Op } = require('sequelize');

const { Transactions, Payments, Bookings, Hotels } = require('../models/index.js');

/**
 * Payment Repository - Contains all database operations for payments
 * Only repositories may import Sequelize models
 */

class PaymentRepository {
  async create(paymentData, options = {}) {
    return await Payments.create(
      {
        transaction_id: paymentData.transaction_id || paymentData.transactionId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        payment_method: paymentData.payment_method || paymentData.paymentMethod,
        payment_status: paymentData.payment_status || paymentData.paymentStatus || 'pending',
        stripe_payment_method_id:
          paymentData.stripe_payment_method_id || paymentData.stripePaymentMethodId,
        card_brand: paymentData.card_brand || paymentData.cardBrand,
        card_last4: paymentData.card_last4 || paymentData.cardLast4,
        card_exp_month: paymentData.card_exp_month || paymentData.cardExpMonth,
        card_exp_year: paymentData.card_exp_year || paymentData.cardExpYear,
        failure_code: paymentData.failure_code || paymentData.failureCode,
        failure_message: paymentData.failure_message || paymentData.failureMessage,
        receipt_url: paymentData.receipt_url || paymentData.receiptUrl,
        metadata: paymentData.metadata,
        paid_at: paymentData.paid_at || paymentData.paidAt,
      },
      options
    );
  }

  async findByTransactionId(transactionId, options = {}) {
    return await Payments.findOne({
      where: { transaction_id: transactionId },
      ...options,
    });
  }

  async update(paymentId, updateData, options = {}) {
    const mappedData = {};
    if (updateData.amount !== undefined) mappedData.amount = updateData.amount;
    if (updateData.currency !== undefined) mappedData.currency = updateData.currency;
    if (updateData.payment_method !== undefined || updateData.paymentMethod !== undefined)
      mappedData.payment_method = updateData.payment_method || updateData.paymentMethod;
    if (updateData.payment_status !== undefined || updateData.paymentStatus !== undefined)
      mappedData.payment_status = updateData.payment_status || updateData.paymentStatus;
    if (
      updateData.stripe_payment_method_id !== undefined ||
      updateData.stripePaymentMethodId !== undefined
    )
      mappedData.stripe_payment_method_id =
        updateData.stripe_payment_method_id || updateData.stripePaymentMethodId;
    if (updateData.card_brand !== undefined || updateData.cardBrand !== undefined)
      mappedData.card_brand = updateData.card_brand || updateData.cardBrand;
    if (updateData.card_last4 !== undefined || updateData.cardLast4 !== undefined)
      mappedData.card_last4 = updateData.card_last4 || updateData.cardLast4;
    if (updateData.card_exp_month !== undefined || updateData.cardExpMonth !== undefined)
      mappedData.card_exp_month = updateData.card_exp_month || updateData.cardExpMonth;
    if (updateData.card_exp_year !== undefined || updateData.cardExpYear !== undefined)
      mappedData.card_exp_year = updateData.card_exp_year || updateData.cardExpYear;
    if (updateData.failure_code !== undefined || updateData.failureCode !== undefined)
      mappedData.failure_code = updateData.failure_code || updateData.failureCode;
    if (updateData.failure_message !== undefined || updateData.failureMessage !== undefined)
      mappedData.failure_message = updateData.failure_message || updateData.failureMessage;
    if (updateData.receipt_url !== undefined || updateData.receiptUrl !== undefined)
      mappedData.receipt_url = updateData.receipt_url || updateData.receiptUrl;
    if (updateData.metadata !== undefined) mappedData.metadata = updateData.metadata;
    if (updateData.paid_at !== undefined || updateData.paidAt !== undefined)
      mappedData.paid_at = updateData.paid_at || updateData.paidAt;

    return await Payments.update(mappedData, {
      where: { id: paymentId },
      ...options,
    });
  }

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
