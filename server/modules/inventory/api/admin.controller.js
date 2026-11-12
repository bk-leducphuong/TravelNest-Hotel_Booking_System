const { listRoomInventory } = require('../application/admin/listRoomInventory');
const { getRoomInventory } = require('../application/admin/getRoomInventory');
const { updateRoomInventory } = require('../application/admin/updateRoomInventory');
const { getHotelOccupancy } = require('../application/admin/getHotelOccupancy');

const listRoomsHandler = async (req, res) => {
  const data = await listRoomInventory(req.params.hotelId, {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  res.status(200).json({ data });
};

const getRoomInventoryHandler = async (req, res) => {
  const data = await getRoomInventory(req.params.roomId, {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  res.status(200).json({ data });
};

const updateRoomInventoryHandler = async (req, res) => {
  const data = await updateRoomInventory(req.params.roomId, req.body, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data });
};

const getHotelOccupancyHandler = async (req, res) => {
  const data = await getHotelOccupancy(req.params.hotelId, {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  res.status(200).json({ data });
};

module.exports = {
  listRoomsHandler,
  getRoomInventoryHandler,
  updateRoomInventoryHandler,
  getHotelOccupancyHandler,
};
