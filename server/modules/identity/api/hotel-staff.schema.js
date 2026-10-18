const Joi = require('joi');

const { HOTEL_ROLES } = require('@constants/roles');

const HOTEL_ROLE_NAMES = Object.values(HOTEL_ROLES);

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });

const hotelStaffParams = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
};

const hotelStaffMemberParams = {
  params: Joi.object({ hotelId: uuid.required(), userId: uuid.required() }).required(),
};

const addHotelStaff = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  body: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(255)
      .required(),
    role: Joi.string()
      .valid(...HOTEL_ROLE_NAMES)
      .required(),
  }).required(),
};

const updateHotelStaff = {
  params: Joi.object({ hotelId: uuid.required(), userId: uuid.required() }).required(),
  body: Joi.object({
    role: Joi.string()
      .valid(...HOTEL_ROLE_NAMES)
      .required(),
  }).required(),
};

module.exports = {
  hotelStaffParams,
  hotelStaffMemberParams,
  addHotelStaff,
  updateHotelStaff,
};
