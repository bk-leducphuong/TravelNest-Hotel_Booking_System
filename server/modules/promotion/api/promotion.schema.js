const Joi = require('joi');

const uuid = Joi.string()
  .uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] })
  .required();

const promotionFields = {
  mode: Joi.string().valid('automatic', 'code'),
  code: Joi.string()
    .trim()
    .min(2)
    .max(64)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .allow(null, '')
    .messages({
      'string.pattern.base':
        'Promo codes may contain letters, numbers, dashes and underscores only',
    }),
  name: Joi.string().trim().min(1).max(150),
  description: Joi.string().max(5000).allow('', null),
  discountType: Joi.string().valid('percentage', 'fixed'),
  discountValue: Joi.number().positive().precision(2).allow(null),
  discountBasisPoints: Joi.number().integer().min(1).max(10000).allow(null),
  maxDiscountAmount: Joi.number().min(0).precision(2).allow(null),
  roomScope: Joi.string().valid('all', 'selected'),
  roomIds: Joi.array()
    .items(Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] }))
    .max(200),
  bookingStartsAt: Joi.date().iso().allow(null),
  bookingEndsAt: Joi.date().iso().allow(null),
  stayStartsOn: Joi.date().iso().allow(null),
  stayEndsOn: Joi.date().iso().allow(null),
  minNights: Joi.number().integer().min(1).allow(null),
  minSubtotal: Joi.number().min(0).precision(2).allow(null),
  minAdvanceDays: Joi.number().integer().min(0).allow(null),
  totalUseLimit: Joi.number().integer().min(1).allow(null),
  perUserLimit: Joi.number().integer().min(1).allow(null),
};

const hotelParams = {
  params: Joi.object({ hotelId: uuid }).required(),
};

const promotionParams = {
  params: Joi.object({ hotelId: uuid, promotionId: uuid }).required(),
};

const listPromotions = {
  ...hotelParams,
  query: Joi.object({
    mode: Joi.string().valid('automatic', 'code'),
    status: Joi.string().valid('draft', 'active', 'paused', 'archived'),
    search: Joi.string().max(150).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }).unknown(false),
};

const createPromotion = {
  ...hotelParams,
  body: Joi.object(promotionFields)
    .required()
    .custom((value, helpers) => {
      if (value.mode === 'code' && !value.code) {
        return helpers.error('any.custom', { message: 'A promo code is required' });
      }
      if (value.mode === 'automatic' && (value.totalUseLimit || value.perUserLimit)) {
        return helpers.error('any.custom', {
          message: 'Automatic promotions do not support usage limits',
        });
      }
      if (value.discountType === 'percentage' && !value.discountBasisPoints) {
        return helpers.error('any.custom', { message: 'Percentage discount is required' });
      }
      if (value.discountType === 'fixed' && !(value.discountValue > 0)) {
        return helpers.error('any.custom', { message: 'Fixed discount amount is required' });
      }
      if (
        value.roomScope === 'selected' &&
        (!Array.isArray(value.roomIds) || !value.roomIds.length)
      ) {
        return helpers.error('any.custom', { message: 'Select at least one room' });
      }
      return value;
    }),
};

const updatePromotion = {
  ...promotionParams,
  query: Joi.object({
    version: Joi.number().integer().min(1).required(),
  }).unknown(false),
  body: Joi.object(promotionFields).min(1).required(),
};

const listRedemptions = {
  ...promotionParams,
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }).unknown(false),
};

const preview = {
  body: Joi.object({
    holdId: Joi.string()
      .uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] })
      .required(),
    code: Joi.string().trim().max(64).allow(null, ''),
  }).required(),
};

module.exports = {
  listPromotions,
  createPromotion,
  updatePromotion,
  listRedemptions,
  preview,
  hotelParams,
  promotionParams,
};
