const adminRoomService = require('@services/admin/room.service');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Admin Room Controller - HTTP ↔ business logic mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/admin/rooms
 * Get all rooms for a specific hotel
 */
const getAllRooms = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId } = req.query;

  const rooms = await adminRoomService.getAllRooms(hotelId, ownerId);

  res.status(200).json({
    data: rooms,
  });
});

/**
 * GET /api/admin/rooms/:roomId
 * Get a specific room by ID
 */
const getRoomById = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { roomId } = req.params;

  const room = await adminRoomService.getRoomById(roomId, ownerId);

  res.status(200).json({
    data: room,
  });
});

/**
 * POST /api/admin/rooms
 * Create a new room
 */
const createRoom = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, ...roomData } = req.body;

  const room = await adminRoomService.createRoom(hotelId, ownerId, roomData);

  res.status(201).json({
    data: room,
    message: 'Room created successfully',
  });
});

/**
 * PATCH /api/admin/rooms/:roomId
 * Update room information
 */
const updateRoom = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { roomId } = req.params;
  const updateData = req.body;

  const room = await adminRoomService.updateRoom(roomId, ownerId, updateData);

  res.status(200).json({
    data: room,
    message: 'Room updated successfully',
  });
});

/**
 * DELETE /api/admin/rooms/:roomId
 * Delete a room
 */
const deleteRoom = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { roomId } = req.params;

  const result = await adminRoomService.deleteRoom(roomId, ownerId);

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/admin/rooms/:roomId/photos
 * Get all photos for a room
 */
const getRoomPhotos = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { roomId } = req.params;

  const result = await adminRoomService.getRoomPhotos(roomId, ownerId);

  res.status(200).json({
    data: result,
  });
});

/**
 * POST /api/admin/rooms/:roomId/photos
 * Add photos to a room
 */
const addRoomPhotos = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { roomId } = req.params;
  const { hotelId } = req.body;

  const result = await adminRoomService.addRoomPhotos(roomId, hotelId, ownerId, req.files);

  res.status(201).json({
    data: result,
  });
});

/**
 * DELETE /api/admin/rooms/:roomId/photos
 * Delete photos from a room
 */
const deleteRoomPhotos = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { roomId } = req.params;
  const { photoUrls } = req.body;

  const result = await adminRoomService.deleteRoomPhotos(roomId, ownerId, photoUrls);

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/admin/hotels/:hotelId/photos
 * Get all photos for a hotel
 */
const getHotelPhotos = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId } = req.params;

  const result = await adminRoomService.getHotelPhotos(hotelId, ownerId);

  res.status(200).json({
    data: result,
  });
});

/**
 * POST /api/admin/hotels/:hotelId/photos
 * Add photos to a hotel
 */
const addHotelPhotos = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId } = req.params;

  const result = await adminRoomService.addHotelPhotos(hotelId, ownerId, req.files);

  res.status(201).json({
    data: result,
  });
});

/**
 * DELETE /api/admin/hotels/:hotelId/photos
 * Delete photos from a hotel
 */
const deleteHotelPhotos = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId } = req.params;
  const { photoUrls } = req.body;

  const result = await adminRoomService.deleteHotelPhotos(hotelId, ownerId, photoUrls);

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/admin/rooms/:roomId/inventory
 * Get room inventory
 */
const getRoomInventory = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { roomId } = req.params;
  const { startDate, endDate } = req.query;

  const result = await adminRoomService.getRoomInventory(
    roomId,
    ownerId,
    startDate ? new Date(startDate) : null,
    endDate ? new Date(endDate) : null
  );

  res.status(200).json({
    data: result,
  });
});

/**
 * PATCH /api/admin/rooms/:roomId/inventory
 * Update room inventory
 */
const updateRoomInventory = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { roomId } = req.params;
  const { inventories } = req.body;

  const result = await adminRoomService.updateRoomInventory(roomId, ownerId, inventories);

  res.status(200).json({
    data: result,
  });
});

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomPhotos,
  addRoomPhotos,
  deleteRoomPhotos,
  getHotelPhotos,
  addHotelPhotos,
  deleteHotelPhotos,
  getRoomInventory,
  updateRoomInventory,
};
