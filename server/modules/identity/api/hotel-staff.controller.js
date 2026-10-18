const asyncHandler = require('@utils/asyncHandler');

const { listHotelStaff } = require('../application/admin/listHotelStaff');
const { addHotelStaff } = require('../application/admin/addHotelStaff');
const { updateHotelStaff } = require('../application/admin/updateHotelStaff');
const { removeHotelStaff } = require('../application/admin/removeHotelStaff');

const actor = (req) => ({ actorUserId: req.user?.id, requestId: req.id });

const listHotelStaffHandler = asyncHandler(async (req, res) => {
  const data = await listHotelStaff(req.params.hotelId);
  res.status(200).json({ data });
});

const addHotelStaffHandler = asyncHandler(async (req, res) => {
  const data = await addHotelStaff(req.params.hotelId, req.body, actor(req));
  res.status(201).json({ data });
});

const updateHotelStaffHandler = asyncHandler(async (req, res) => {
  const data = await updateHotelStaff(req.params.hotelId, req.params.userId, req.body, actor(req));
  res.status(200).json({ data });
});

const removeHotelStaffHandler = asyncHandler(async (req, res) => {
  const data = await removeHotelStaff(req.params.hotelId, req.params.userId, actor(req));
  res.status(200).json({ data });
});

module.exports = {
  listHotelStaffHandler,
  addHotelStaffHandler,
  updateHotelStaffHandler,
  removeHotelStaffHandler,
};
