const Joi = require('joi');

const { POLICY_TYPES } = require('@constants/hotels');

/**
 * Catalog module validation schemas (admin / host property management).
 * IDs are UUIDs; dates are ISO.
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });
const hotelStatus = Joi.string().valid('active', 'inactive', 'pending', 'suspended');
const roomStatus = Joi.string().valid('active', 'inactive');

const listHotels = {
  query: Joi.object({
    search: Joi.string().max(200).allow(''),
    status: hotelStatus,
    cityId: uuid,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }).unknown(false),
};

const hotelParams = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
};

const roomParams = {
  params: Joi.object({ hotelId: uuid.required(), roomId: uuid.required() }).required(),
};

const updateHotel = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  body: Joi.object({
    name: Joi.string().max(255),
    description: Joi.string().allow('', null),
    address: Joi.string().max(255),
    cityId: uuid,
    countryId: uuid,
    phoneNumber: Joi.string().max(50).allow('', null),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    hotelClass: Joi.number().integer().min(1).max(5),
    checkInTime: Joi.string().max(50),
    checkOutTime: Joi.string().max(50),
    checkInPolicy: Joi.string().allow('', null),
    checkOutPolicy: Joi.string().allow('', null),
    minPrice: Joi.number().min(0),
    status: hotelStatus,
    timezone: Joi.string().max(64),
  })
    .min(1)
    .required(),
};

const ROOM_BODY_FIELDS = {
  roomName: Joi.string().max(255),
  roomType: Joi.string().max(100),
  maxGuests: Joi.number().integer().min(1),
  quantity: Joi.number().integer().min(0),
  roomSize: Joi.number().min(0),
  status: roomStatus,
};

const createRoom = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  body: Joi.object({
    ...ROOM_BODY_FIELDS,
    roomName: Joi.string().max(255).required(),
  }).required(),
};

const updateRoom = {
  params: Joi.object({ hotelId: uuid.required(), roomId: uuid.required() }).required(),
  body: Joi.object(ROOM_BODY_FIELDS).min(1).required(),
};

const policyParams = {
  params: Joi.object({ hotelId: uuid.required(), policyId: uuid.required() }).required(),
};

const POLICY_BODY_FIELDS = {
  policyType: Joi.string().valid(...POLICY_TYPES),
  title: Joi.string().max(150),
  description: Joi.string().max(5000),
  displayOrder: Joi.number().integer().min(0),
  icon: Joi.string().max(50).allow('', null),
  isActive: Joi.boolean(),
};

const createPolicy = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  body: Joi.object({
    ...POLICY_BODY_FIELDS,
    policyType: Joi.string()
      .valid(...POLICY_TYPES)
      .required(),
    title: Joi.string().max(150).required(),
    description: Joi.string().max(5000).required(),
  }).required(),
};

const updatePolicy = {
  params: Joi.object({ hotelId: uuid.required(), policyId: uuid.required() }).required(),
  body: Joi.object(POLICY_BODY_FIELDS).min(1).required(),
};

module.exports = {
  listHotels,
  hotelParams,
  roomParams,
  updateHotel,
  createRoom,
  updateRoom,
  policyParams,
  createPolicy,
  updatePolicy,
};
