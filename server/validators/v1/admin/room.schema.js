const Joi = require('joi');

/**
 * Admin Room validation schemas
 * Following RESTful API standards
 */

// Common validations
const hotelIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'hotelId must be a number',
  'number.integer': 'hotelId must be an integer',
  'number.positive': 'hotelId must be a positive number',
  'any.required': 'hotelId is required',
});

const roomIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'roomId must be a number',
  'number.integer': 'roomId must be an integer',
  'number.positive': 'roomId must be a positive number',
  'any.required': 'roomId is required',
});

/**
 * GET /api/admin/rooms
 * Get all rooms for a specific hotel
 */
exports.getAllRooms = {
  query: Joi.object({
    hotelId: hotelIdSchema,
  }),
};

/**
 * GET /api/admin/rooms/:roomId
 * Get a specific room by ID
 */
exports.getRoomById = {
  params: Joi.object({
    roomId: roomIdSchema,
  }).required(),
  query: Joi.object({}).unknown(false),
};

/**
 * POST /api/admin/rooms
 * Create a new room
 */
exports.createRoom = {
  body: Joi.object({
    hotelId: hotelIdSchema,
    roomName: Joi.string().min(1).max(255).required().messages({
      'string.base': 'roomName must be a string',
      'string.min': 'roomName must not be empty',
      'string.max': 'roomName must not exceed 255 characters',
      'any.required': 'roomName is required',
    }),
    roomType: Joi.string().min(1).max(100).required().messages({
      'string.base': 'roomType must be a string',
      'string.min': 'roomType must not be empty',
      'string.max': 'roomType must not exceed 100 characters',
      'any.required': 'roomType is required',
    }),
    quantity: Joi.number().integer().min(1).required().messages({
      'number.base': 'quantity must be a number',
      'number.integer': 'quantity must be an integer',
      'number.min': 'quantity must be at least 1',
      'any.required': 'quantity is required',
    }),
    roomSize: Joi.number().min(0).messages({
      'number.base': 'roomSize must be a number',
      'number.min': 'roomSize must be at least 0',
    }),
    roomAmenities: Joi.string().allow('').max(2000).messages({
      'string.base': 'roomAmenities must be a string',
      'string.max': 'roomAmenities must not exceed 2000 characters',
    }),
  }).required(),
};

/**
 * PATCH /api/admin/rooms/:roomId
 * Update room information
 */
exports.updateRoom = {
  params: Joi.object({
    roomId: roomIdSchema,
  }).required(),
  body: Joi.object({
    roomName: Joi.string().min(1).max(255).messages({
      'string.base': 'roomName must be a string',
      'string.min': 'roomName must not be empty',
      'string.max': 'roomName must not exceed 255 characters',
    }),
    roomType: Joi.string().min(1).max(100).messages({
      'string.base': 'roomType must be a string',
      'string.min': 'roomType must not be empty',
      'string.max': 'roomType must not exceed 100 characters',
    }),
    quantity: Joi.number().integer().min(1).messages({
      'number.base': 'quantity must be a number',
      'number.integer': 'quantity must be an integer',
      'number.min': 'quantity must be at least 1',
    }),
    roomSize: Joi.number().min(0).messages({
      'number.base': 'roomSize must be a number',
      'number.min': 'roomSize must be at least 0',
    }),
    roomAmenities: Joi.string().allow('').max(2000).messages({
      'string.base': 'roomAmenities must be a string',
      'string.max': 'roomAmenities must not exceed 2000 characters',
    }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),
};

/**
 * DELETE /api/admin/rooms/:roomId
 * Delete a room
 */
exports.deleteRoom = {
  params: Joi.object({
    roomId: roomIdSchema,
  }).required(),
};

/**
 * GET /api/admin/rooms/:roomId/photos
 * Get all photos for a room
 */
exports.getRoomPhotos = {
  params: Joi.object({
    roomId: roomIdSchema,
  }).required(),
  query: Joi.object({}).unknown(false),
};

/**
 * POST /api/admin/rooms/:roomId/photos
 * Add photos to a room (handled by multer middleware)
 */
exports.addRoomPhotos = {
  params: Joi.object({
    roomId: roomIdSchema,
  }).required(),
};

/**
 * DELETE /api/admin/rooms/:roomId/photos
 * Delete photos from a room
 */
exports.deleteRoomPhotos = {
  params: Joi.object({
    roomId: roomIdSchema,
  }).required(),
  body: Joi.object({
    photoUrls: Joi.array().items(Joi.string().uri()).min(1).required().messages({
      'array.base': 'photoUrls must be an array',
      'array.min': 'At least one photo URL must be provided',
      'any.required': 'photoUrls is required',
    }),
  }).required(),
};

/**
 * GET /api/admin/rooms/:roomId/inventory
 * Get room inventory (availability and pricing)
 */
exports.getRoomInventory = {
  params: Joi.object({
    roomId: roomIdSchema,
  }).required(),
  query: Joi.object({
    startDate: Joi.date().iso().messages({
      'date.base': 'startDate must be a valid date',
      'date.format': 'startDate must be in ISO format',
    }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
      'date.base': 'endDate must be a valid date',
      'date.format': 'endDate must be in ISO format',
      'date.min': 'endDate must be after or equal to startDate',
    }),
  }),
};

/**
 * PATCH /api/admin/rooms/:roomId/inventory
 * Update room inventory
 */
exports.updateRoomInventory = {
  params: Joi.object({
    roomId: roomIdSchema,
  }).required(),
  body: Joi.object({
    inventories: Joi.array()
      .items(
        Joi.object({
          date: Joi.date().iso().required().messages({
            'date.base': 'date must be a valid date',
            'date.format': 'date must be in ISO format',
            'any.required': 'date is required',
          }),
          pricePerNight: Joi.number().min(0).messages({
            'number.base': 'pricePerNight must be a number',
            'number.min': 'pricePerNight must be at least 0',
          }),
          status: Joi.string().valid('open', 'closed').messages({
            'any.only': 'status must be either open or closed',
          }),
          totalReserved: Joi.number().integer().min(0).messages({
            'number.base': 'totalReserved must be a number',
            'number.integer': 'totalReserved must be an integer',
            'number.min': 'totalReserved must be at least 0',
          }),
        })
      )
      .min(1)
      .required()
      .messages({
        'array.base': 'inventories must be an array',
        'array.min': 'At least one inventory entry must be provided',
        'any.required': 'inventories is required',
      }),
  }).required(),
};

/**
 * GET /api/admin/hotels/:hotelId/photos
 * Get all photos for a hotel
 */
exports.getHotelPhotos = {
  params: Joi.object({
    hotelId: hotelIdSchema,
  }).required(),
  query: Joi.object({}).unknown(false),
};

/**
 * POST /api/admin/hotels/:hotelId/photos
 * Add photos to a hotel (handled by multer middleware)
 */
exports.addHotelPhotos = {
  params: Joi.object({
    hotelId: hotelIdSchema,
  }).required(),
};

/**
 * DELETE /api/admin/hotels/:hotelId/photos
 * Delete photos from a hotel
 */
exports.deleteHotelPhotos = {
  params: Joi.object({
    hotelId: hotelIdSchema,
  }).required(),
  body: Joi.object({
    photoUrls: Joi.array().items(Joi.string().uri()).min(1).required().messages({
      'array.base': 'photoUrls must be an array',
      'array.min': 'At least one photo URL must be provided',
      'any.required': 'photoUrls is required',
    }),
  }).required(),
};
