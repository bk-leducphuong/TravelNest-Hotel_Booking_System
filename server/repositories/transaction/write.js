const { Transactions } = require('@models/index.js');
const logger = require('@config/logger.config');

/**
 * Transaction write operations.
 */

async function create(transactionData, options = {}) {
  try {
    const requestedTransactionType =
      transactionData.transactionType || transactionData.transaction_type || 'payment';
    const transactionType =
      requestedTransactionType === 'booking_payment' ? 'payment' : requestedTransactionType;

    return await Transactions.create(
      {
        booking_id: transactionData.bookingId || transactionData.booking_id,
        buyer_id: transactionData.buyerId || transactionData.buyer_id,
        hotel_id: transactionData.hotelId || transactionData.hotel_id,
        amount: transactionData.amount,
        currency: transactionData.currency || 'USD',
        status: transactionData.status || 'pending',
        transaction_type: transactionType,
        payment_method: transactionData.paymentMethod || transactionData.payment_method,
        stripe_payment_intent_id:
          transactionData.paymentIntentId || transactionData.stripe_payment_intent_id,
        stripe_charge_id: transactionData.chargeId || transactionData.stripe_charge_id,
        stripe_customer_id: transactionData.customerId || transactionData.stripe_customer_id,
        stripe_refund_id: transactionData.refundId || transactionData.stripe_refund_id,
        failure_code: transactionData.failureCode || transactionData.failure_code,
        failure_message: transactionData.failureMessage || transactionData.failure_message,
        metadata: transactionData.metadata,
        completed_at: transactionData.completedAt || transactionData.completed_at,
      },
      options
    );
  } catch (error) {
    logger.error('Error creating transaction:', error);
    throw error;
  }
}

async function update(transactionId, updateData, options = {}) {
  try {
    const mappedData = {};
    if (updateData.status !== undefined) mappedData.status = updateData.status;
    if (updateData.chargeId !== undefined || updateData.stripe_charge_id !== undefined)
      mappedData.stripe_charge_id = updateData.chargeId || updateData.stripe_charge_id;
    if (
      updateData.paymentIntentId !== undefined ||
      updateData.stripe_payment_intent_id !== undefined
    )
      mappedData.stripe_payment_intent_id =
        updateData.paymentIntentId || updateData.stripe_payment_intent_id;
    if (updateData.refundId !== undefined || updateData.stripe_refund_id !== undefined)
      mappedData.stripe_refund_id = updateData.refundId || updateData.stripe_refund_id;
    if (updateData.failureCode !== undefined || updateData.failure_code !== undefined)
      mappedData.failure_code = updateData.failureCode || updateData.failure_code;
    if (updateData.failureMessage !== undefined || updateData.failure_message !== undefined)
      mappedData.failure_message = updateData.failureMessage || updateData.failure_message;
    if (updateData.metadata !== undefined) mappedData.metadata = updateData.metadata;
    if (updateData.completedAt !== undefined || updateData.completed_at !== undefined)
      mappedData.completed_at = updateData.completedAt || updateData.completed_at;
    if (updateData.paymentMethod !== undefined || updateData.payment_method !== undefined)
      mappedData.payment_method = updateData.paymentMethod || updateData.payment_method;

    return await Transactions.update(mappedData, {
      where: { id: transactionId },
      ...options,
    });
  } catch (error) {
    logger.error('Error updating transaction:', error);
    throw error;
  }
}

async function updateStatus(transactionId, status, options = {}) {
  try {
    return await update(transactionId, { status }, options);
  } catch (error) {
    logger.error('Error updating transaction status:', error);
    throw error;
  }
}

async function remove(transactionId, options = {}) {
  try {
    return await updateStatus(transactionId, 'cancelled', options);
  } catch (error) {
    logger.error('Error deleting transaction:', error);
    throw error;
  }
}

module.exports = { create, update, updateStatus, delete: remove };
