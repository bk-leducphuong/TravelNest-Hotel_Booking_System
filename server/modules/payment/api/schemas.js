const Joi = require('joi');

/**
 * Payment module validation schemas (admin).
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });
const isoDate = Joi.date().iso();
const paginationQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const TRANSACTION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
];
const TRANSACTION_TYPES = ['payment', 'refund', 'payout'];
const REFUND_STATUSES = ['pending', 'processing', 'succeeded', 'failed', 'cancelled'];
const REFUND_REASONS = [
  'free_cancellation',
  'customer_request',
  'hotel_cancelled',
  'duplicate',
  'fraudulent',
  'other',
];

const listTransactions = {
  query: Joi.object({
    hotelId: uuid,
    status: Joi.string().valid(...TRANSACTION_STATUSES),
    transactionType: Joi.string().valid(...TRANSACTION_TYPES),
    bookingId: uuid,
    buyerId: uuid,
    dateFrom: isoDate,
    dateTo: isoDate,
    ...paginationQuery,
  }).unknown(false),
};

const getTransaction = {
  params: Joi.object({ transactionId: uuid.required() }).required(),
};

const getHotelPaymentSummary = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
};

const initiateRefund = {
  params: Joi.object({ transactionId: uuid.required() }).required(),
  body: Joi.object({
    amount: Joi.number().greater(0),
    reason: Joi.string().valid(...REFUND_REASONS),
  }).required(),
};

const listRefunds = {
  query: Joi.object({
    hotelId: uuid,
    status: Joi.string().valid(...REFUND_STATUSES),
    transactionId: uuid,
    dateFrom: isoDate,
    dateTo: isoDate,
    ...paginationQuery,
  }).unknown(false),
};

const getRefund = {
  params: Joi.object({ refundId: uuid.required() }).required(),
};

const retryRefund = {
  params: Joi.object({ refundId: uuid.required() }).required(),
};

module.exports = {
  listTransactions,
  getTransaction,
  getHotelPaymentSummary,
  initiateRefund,
  listRefunds,
  getRefund,
  retryRefund,
};
