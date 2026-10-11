const Joi = require('joi');

/**
 * Superadmin module validation schemas.
 * IDs are UUIDs (v4/v5/v7); list endpoints are paginated.
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const hotelStatus = Joi.string().valid('active', 'inactive', 'pending', 'suspended');
const userStatus = Joi.string().valid('active', 'inactive', 'banned');

const listHotels = {
  query: Joi.object({
    search: Joi.string().max(200).allow(''),
    status: hotelStatus,
    cityId: uuid,
    ...pagination,
  }).unknown(false),
};

const hotelParams = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
};

const listUsers = {
  query: Joi.object({
    search: Joi.string().max(200).allow(''),
    status: userStatus,
    role: Joi.string().max(50),
    ...pagination,
  }).unknown(false),
};

const userParams = {
  params: Joi.object({ userId: uuid.required() }).required(),
};

const listAudit = {
  query: Joi.object({
    action: Joi.string().max(100),
    entityType: Joi.string().max(50),
    entityId: Joi.string().max(64),
    actorUserId: uuid,
    hotelId: uuid,
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(50),
  }).unknown(false),
};

module.exports = {
  uuid,
  pagination,
  listHotels,
  hotelParams,
  listUsers,
  userParams,
  listAudit,
};
