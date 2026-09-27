const asyncHandler = require('@utils/asyncHandler');

const { listRoomInventory } = require('../application/admin/listRoomInventory');
const { getRoomInventory } = require('../application/admin/getRoomInventory');
const { updateRoomInventory } = require('../application/admin/updateRoomInventory');
const { getHotelOccupancy } = require('../application/admin/getHotelOccupancy');

const listRoomsHandler = asyncHandler(async (req, res) => {
  const data = await listRoomInventory(req.params.hotelId, {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  res.status(200).json({ data });
});

const getRoomInventoryHandler = asyncHandler(async (req, res) => {
  const data = await getRoomInventory(req.params.roomId, {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  res.status(200).json({ data });
});

const updateRoomInventoryHandler = asyncHandler(async (req, res) => {
  const data = await updateRoomInventory(req.params.roomId, req.body, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data });
});

const getHotelOccupancyHandler = asyncHandler(async (req, res) => {
  const data = await getHotelOccupancy(req.params.hotelId, {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  res.status(200).json({ data });
});

module.exports = {
  listRoomsHandler,
  getRoomInventoryHandler,
  updateRoomInventoryHandler,
  getHotelOccupancyHandler,
};
