const Joi = require('joi');

exports.id = Joi.string().uuid();

exports.pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};
