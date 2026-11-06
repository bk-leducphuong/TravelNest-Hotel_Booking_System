const { Op } = require('sequelize');

const { Amenities, HotelAmenities, RoomAmenities } = require('@platform/database');

/**
 * Amenity catalog + assignment reads/writes for the back-office.
 * Amenities are shared reference data; assignments are per hotel / per room.
 */

async function findAmenitiesForAdmin({
  search,
  category,
  applicableTo,
  limit = 100,
  offset = 0,
} = {}) {
  const where = { is_active: true };

  if (category) {
    where.category = category;
  }
  if (applicableTo) {
    // `both` amenities apply wherever; include them for a hotel/room filter.
    const values = applicableTo === 'both' ? ['both'] : [applicableTo, 'both'];
    where.applicable_to = { [Op.in]: values };
  }
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { code: { [Op.like]: `%${search.toUpperCase()}%` } },
    ];
  }

  return await Amenities.findAndCountAll({
    where,
    attributes: [
      'id',
      'code',
      'name',
      'icon',
      'category',
      'applicable_to',
      'description',
      'display_order',
    ],
    limit,
    offset,
    order: [
      ['category', 'ASC'],
      ['display_order', 'ASC'],
      ['name', 'ASC'],
    ],
    distinct: true,
  });
}

async function findHotelAmenityIds(hotelId) {
  const rows = await HotelAmenities.findAll({
    where: { hotel_id: hotelId },
    attributes: ['amenity_id'],
  });
  return rows.map((row) => row.amenity_id);
}

/** Replace-set the hotel's amenity assignments. */
async function setHotelAmenities(hotelId, amenityIds, options = {}) {
  const { transaction } = options;

  await HotelAmenities.destroy({ where: { hotel_id: hotelId }, transaction });

  if (amenityIds.length === 0) {
    return [];
  }

  const now = new Date();
  await HotelAmenities.bulkCreate(
    amenityIds.map((amenityId) => ({
      hotel_id: hotelId,
      amenity_id: amenityId,
      is_available: true,
      is_free: true,
      created_at: now,
      updated_at: now,
    })),
    { transaction }
  );

  return amenityIds;
}

async function findRoomAmenityIds(roomId) {
  const rows = await RoomAmenities.findAll({
    where: { room_id: roomId },
    attributes: ['amenity_id'],
  });
  return rows.map((row) => row.amenity_id);
}

/** Replace-set a room's amenity assignments. */
async function setRoomAmenities(roomId, amenityIds, options = {}) {
  const { transaction } = options;

  await RoomAmenities.destroy({ where: { room_id: roomId }, transaction });

  if (amenityIds.length === 0) {
    return [];
  }

  const now = new Date();
  await RoomAmenities.bulkCreate(
    amenityIds.map((amenityId) => ({
      room_id: roomId,
      amenity_id: amenityId,
      is_available: true,
      created_at: now,
      updated_at: now,
    })),
    { transaction }
  );

  return amenityIds;
}

module.exports = {
  findAmenitiesForAdmin,
  findHotelAmenityIds,
  setHotelAmenities,
  findRoomAmenityIds,
  setRoomAmenities,
};
