const Joi = require('joi');

const { POLICY_TYPES, IANA_TIMEZONES, HOTEL_STATUSES } = require('@constants/hotels');
const { ROOM_STATUSES, BED_TYPES } = require('@constants/rooms');
const { AMENITY_CATEGORIES, APPLICABLE_TO } = require('@constants/amenities');

/**
 * Catalog module validation schemas (admin / host property management).
 * IDs are UUIDs; dates are ISO.
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });
// Derive the status allowlists from the constants (single source of truth) so
// the admin API can never offer a value the model/DB enum rejects — and so
// `maintenance` (rooms) and the real hotel lifecycle states are accepted.
const hotelStatus = Joi.string().valid(...HOTEL_STATUSES);
const roomStatus = Joi.string().valid(...ROOM_STATUSES);

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

// Global location lookups used by the property editor (city/country selects).
const listCities = {
  query: Joi.object({
    search: Joi.string().max(150).allow(''),
    countryId: uuid,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(100),
  }).unknown(false),
};

const listCountries = {
  query: Joi.object({
    search: Joi.string().max(150).allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(300).default(200),
  }).unknown(false),
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
    timezone: Joi.string()
      .valid(...IANA_TIMEZONES)
      .messages({
        'any.only': 'timezone must be a supported IANA timezone',
      }),
  })
    .min(1)
    .required(),
};

const ROOM_BODY_FIELDS = {
  roomName: Joi.string().max(255),
  roomType: Joi.string().max(100),
  bedType: Joi.string().valid(...BED_TYPES),
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

// --- Amenities ---

const listAmenities = {
  query: Joi.object({
    search: Joi.string().max(100).allow(''),
    category: Joi.string().valid(...AMENITY_CATEGORIES),
    applicableTo: Joi.string().valid(...APPLICABLE_TO),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(100),
  }).unknown(false),
};

const AMENITY_SET_BODY = Joi.object({
  amenityIds: Joi.array().items(uuid).unique().required(),
}).required();

const setHotelAmenities = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  body: AMENITY_SET_BODY,
};

const setRoomAmenities = {
  params: Joi.object({ hotelId: uuid.required(), roomId: uuid.required() }).required(),
  body: AMENITY_SET_BODY,
};

// --- Cancellation rules ---

const CANCELLATION_RULE_BODY_FIELDS = {
  roomId: uuid.allow(null),
  isRefundable: Joi.boolean(),
  freeCancellationUntilHoursBeforeCheckin: Joi.number().integer().min(0).allow(null),
  refundPercentBeforeDeadline: Joi.number().min(0).max(100),
  refundPercentAfterDeadline: Joi.number().min(0).max(100),
  cancellationFeeType: Joi.string().valid('none', 'percentage'),
  cancellationFeeValue: Joi.number().min(0).allow(null),
  isActive: Joi.boolean(),
};

const cancellationRuleParams = {
  params: Joi.object({ hotelId: uuid.required(), ruleId: uuid.required() }).required(),
};

const createCancellationRule = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  body: Joi.object(CANCELLATION_RULE_BODY_FIELDS).default({}),
};

const updateCancellationRule = {
  params: Joi.object({ hotelId: uuid.required(), ruleId: uuid.required() }).required(),
  body: Joi.object(CANCELLATION_RULE_BODY_FIELDS).min(1).required(),
};

module.exports = {
  listHotels,
  listCities,
  listCountries,
  listAmenities,
  setHotelAmenities,
  setRoomAmenities,
  hotelParams,
  roomParams,
  updateHotel,
  createRoom,
  updateRoom,
  policyParams,
  createPolicy,
  updatePolicy,
  cancellationRuleParams,
  createCancellationRule,
  updateCancellationRule,
};
