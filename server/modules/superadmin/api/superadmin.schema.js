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

module.exports = {
  uuid,
  pagination,
};
