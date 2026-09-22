const Joi = require('joi');

/**
 * Inventory module validation schemas (admin).
 * IDs are UUIDs; dates are ISO dates.
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });
const isoDate = Joi.date().iso();
const status = Joi.string().valid('open', 'close', 'closed', 'sold_out', 'maintenance');

const getHotelRooms = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  query: Joi.object({ startDate: isoDate, endDate: isoDate }).unknown(false),
};

const getHotelOccupancy = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  query: Joi.object({ startDate: isoDate, endDate: isoDate }).unknown(false),
};

const getRoomInventory = {
  params: Joi.object({ roomId: uuid.required() }).required(),
  query: Joi.object({ startDate: isoDate, endDate: isoDate }).unknown(false),
};

const updateRoomInventory = {
  params: Joi.object({ roomId: uuid.required() }).required(),
  body: Joi.object({
    startDate: isoDate,
    endDate: isoDate,
    pricePerNight: Joi.number().min(0),
    totalRooms: Joi.number().integer().min(0),
    status,
    currency: Joi.string().length(3).uppercase(),
    reason: Joi.string().max(1000).allow('', null),
    entries: Joi.array()
      .items(
        Joi.object({
          date: isoDate.required(),
          pricePerNight: Joi.number().min(0),
          totalRooms: Joi.number().integer().min(0),
          status,
          currency: Joi.string().length(3).uppercase(),
        })
      )
      .min(1),
  })
    .or('entries', 'startDate')
    .required(),
};

module.exports = {
  getHotelRooms,
  getHotelOccupancy,
  getRoomInventory,
  updateRoomInventory,
};
