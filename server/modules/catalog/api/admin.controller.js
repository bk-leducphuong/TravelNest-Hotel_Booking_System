const asyncHandler = require('@utils/asyncHandler');

const { listHotels } = require('../application/admin/listHotels');
const { listCities } = require('../application/admin/listCities');
const { listCountries } = require('../application/admin/listCountries');
const { getHotel } = require('../application/admin/getHotel');
const { updateHotel } = require('../application/admin/updateHotel');
const { listRooms } = require('../application/admin/listRooms');
const { createRoom } = require('../application/admin/createRoom');
const { updateRoom } = require('../application/admin/updateRoom');
const { deleteRoom } = require('../application/admin/deleteRoom');
const { listPolicies } = require('../application/admin/listPolicies');
const { createPolicy } = require('../application/admin/createPolicy');
const { updatePolicy } = require('../application/admin/updatePolicy');
const { deletePolicy } = require('../application/admin/deletePolicy');

const actor = (req) => ({ actorUserId: req.user?.id, requestId: req.id });

const listHotelsHandler = asyncHandler(async (req, res) => {
  // `hotelScopeIds` is set for non-staff callers (their hotels); platform staff
  // get `undefined` and therefore a global list.
  const { hotels, page, limit, total } = await listHotels({
    ...req.query,
    hotelIds: req.hotelScopeIds,
  });
  res.status(200).json({ data: hotels, meta: { page, limit, total } });
});

const listCitiesHandler = asyncHandler(async (req, res) => {
  const { cities, page, limit, total } = await listCities(req.query);
  res.status(200).json({ data: cities, meta: { page, limit, total } });
});

const listCountriesHandler = asyncHandler(async (req, res) => {
  const { countries, page, limit, total } = await listCountries(req.query);
  res.status(200).json({ data: countries, meta: { page, limit, total } });
});

const getHotelHandler = asyncHandler(async (req, res) => {
  const data = await getHotel(req.params.hotelId);
  res.status(200).json({ data });
});

const updateHotelHandler = asyncHandler(async (req, res) => {
  const data = await updateHotel(req.params.hotelId, req.body, actor(req));
  res.status(200).json({ data });
});

const listRoomsHandler = asyncHandler(async (req, res) => {
  const data = await listRooms(req.params.hotelId);
  res.status(200).json({ data });
});

const createRoomHandler = asyncHandler(async (req, res) => {
  const data = await createRoom(req.params.hotelId, req.body, actor(req));
  res.status(201).json({ data });
});

const updateRoomHandler = asyncHandler(async (req, res) => {
  const data = await updateRoom(req.params.hotelId, req.params.roomId, req.body, actor(req));
  res.status(200).json({ data });
});

const deleteRoomHandler = asyncHandler(async (req, res) => {
  const data = await deleteRoom(req.params.hotelId, req.params.roomId, actor(req));
  res.status(200).json({ data });
});

const listPoliciesHandler = asyncHandler(async (req, res) => {
  const data = await listPolicies(req.params.hotelId);
  res.status(200).json({ data });
});

const createPolicyHandler = asyncHandler(async (req, res) => {
  const data = await createPolicy(req.params.hotelId, req.body, actor(req));
  res.status(201).json({ data });
});

const updatePolicyHandler = asyncHandler(async (req, res) => {
  const data = await updatePolicy(req.params.hotelId, req.params.policyId, req.body, actor(req));
  res.status(200).json({ data });
});

const deletePolicyHandler = asyncHandler(async (req, res) => {
  const data = await deletePolicy(req.params.hotelId, req.params.policyId, actor(req));
  res.status(200).json({ data });
});

module.exports = {
  listHotelsHandler,
  listCitiesHandler,
  listCountriesHandler,
  getHotelHandler,
  updateHotelHandler,
  listRoomsHandler,
  createRoomHandler,
  updateRoomHandler,
  deleteRoomHandler,
  listPoliciesHandler,
  createPolicyHandler,
  updatePolicyHandler,
  deletePolicyHandler,
};
