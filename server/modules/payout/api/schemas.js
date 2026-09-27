const Joi = require('joi');

/**
 * Payout module validation schemas (admin).
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });
const isoDate = Joi.date().iso();
const paginationQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const PAYOUT_STATUSES = ['pending', 'processing', 'paid', 'failed', 'cancelled'];
const ACCOUNT_TYPES = ['express', 'standard', 'custom'];

const listPayouts = {
  query: Joi.object({
    hotelId: uuid,
    ownerId: uuid,
    connectedPaymentAccountId: uuid,
    transactionId: uuid,
    status: Joi.string().valid(...PAYOUT_STATUSES),
    dateFrom: isoDate,
    dateTo: isoDate,
    ...paginationQuery,
  }).unknown(false),
};

const getPayout = {
  params: Joi.object({ payoutId: uuid.required() }).required(),
};

const getHotelPayoutSummary = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
};

const generateEligiblePayouts = {
  body: Joi.object({
    cutoffDate: isoDate,
    ownerId: uuid,
  }).required(),
};

const processPayout = {
  params: Joi.object({ payoutId: uuid.required() }).required(),
};

const setPayoutStatus = {
  params: Joi.object({ payoutId: uuid.required() }).required(),
  body: Joi.object({
    status: Joi.string()
      .valid(...PAYOUT_STATUSES)
      .required(),
    failureCode: Joi.string().max(100).allow('', null),
    failureMessage: Joi.string().max(1000).allow('', null),
  }).required(),
};

const listConnectedAccounts = {
  query: Joi.object({ hotelId: uuid, ownerId: uuid }).or('hotelId', 'ownerId').required(),
};

const checkConnectedAccount = {
  query: Joi.object({ hotelId: uuid, ownerId: uuid }).or('hotelId', 'ownerId').required(),
};

const createConnectAccount = {
  body: Joi.object({
    ownerId: uuid.required(),
    hotelId: uuid,
    email: Joi.string().email().max(255),
    country: Joi.string().length(2).uppercase(),
    accountType: Joi.string().valid(...ACCOUNT_TYPES),
    isDefault: Joi.boolean(),
  }).required(),
};

const createAccountLink = {
  params: Joi.object({ accountId: uuid.required() }).required(),
  body: Joi.object({
    refreshUrl: Joi.string().uri().max(500),
    returnUrl: Joi.string().uri().max(500),
  }).required(),
};

const syncConnectedAccount = {
  params: Joi.object({ accountId: uuid.required() }).required(),
};

module.exports = {
  listPayouts,
  getPayout,
  getHotelPayoutSummary,
  generateEligiblePayouts,
  processPayout,
  setPayoutStatus,
  listConnectedAccounts,
  checkConnectedAccount,
  createConnectAccount,
  createAccountLink,
  syncConnectedAccount,
};
