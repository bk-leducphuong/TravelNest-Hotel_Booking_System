const { Op } = require('sequelize');

const {
  hotels: Hotels,
  users: Users,
  bookings: Bookings,
  rooms: Rooms,
  reviews: Reviews,
  hotel_users: HotelUsers,
  user_roles: UserRoles,
  hotel_rating_summaries: HotelRatingSummaries,
} = require('@models/index.js');

/**
 * Superadmin repository - platform-wide (cross-tenant) reads.
 *
 * This is the only layer in the module that touches Sequelize models for the
 * hotel/user/audit views. List endpoints avoid N+1 by batching the related
 * lookups for a whole page of ids. Platform KPI aggregates live in
 * `platform-stats.repository.js` (precomputed snapshot).
 */

// ---------------------------------------------------------------------------
// Hotels
// ---------------------------------------------------------------------------

function hotelListInclude() {
  return [
    { association: 'city', attributes: ['id', 'name'], required: false },
    { association: 'country', attributes: ['id', 'name', 'iso_code'], required: false },
  ];
}

async function listHotels({ search, status, cityId, limit, offset } = {}) {
  const where = {};

  if (status) {
    where.status = status;
  }
  if (cityId) {
    where.city_id = cityId;
  }
  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  return await Hotels.findAndCountAll({
    where,
    include: hotelListInclude(),
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  });
}

async function findHotelById(hotelId) {
  return await Hotels.findOne({
    where: { id: hotelId },
    include: hotelListInclude(),
  });
}

/**
 * Primary owners for a page of hotels, in one query.
 * @returns {Map<string, { id, email, name }>} keyed by hotel id.
 */
async function findPrimaryOwnersByHotelIds(hotelIds) {
  if (!hotelIds || hotelIds.length === 0) {
    return new Map();
  }

  const rows = await HotelUsers.findAll({
    where: { hotel_id: { [Op.in]: hotelIds }, is_primary_owner: true },
    attributes: ['hotel_id'],
    include: [
      {
        association: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name'],
        required: false,
      },
    ],
  });

  const owners = new Map();
  for (const row of rows) {
    const user = row.user;
    if (!user) {
      continue;
    }
    owners.set(String(row.hotel_id), {
      id: user.id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || null,
    });
  }

  return owners;
}

async function findHotelMembers(hotelId) {
  return await HotelUsers.findAll({
    where: { hotel_id: hotelId },
    attributes: ['id', 'user_id', 'is_primary_owner', 'created_at'],
    include: [
      {
        association: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name', 'status'],
        required: false,
      },
      { association: 'role', attributes: ['id', 'name'], required: false },
    ],
    order: [['is_primary_owner', 'DESC']],
  });
}

async function getHotelCounts(hotelId) {
  const [rooms, bookings, reviews] = await Promise.all([
    Rooms.count({ where: { hotel_id: hotelId } }),
    Bookings.count({ where: { hotel_id: hotelId } }),
    Reviews.count({ where: { hotel_id: hotelId } }),
  ]);

  return { rooms, bookings, reviews };
}

async function getHotelRating(hotelId) {
  return await HotelRatingSummaries.findOne({
    where: { hotel_id: hotelId },
    attributes: ['overall_rating', 'total_reviews'],
  });
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function userListAttributes() {
  return [
    'id',
    'email',
    'first_name',
    'last_name',
    'phone_number',
    'status',
    'created_at',
    'last_login_at',
    'email_verified_at',
  ];
}

async function listUsers({ search, status, role, limit, offset } = {}) {
  const where = {};

  if (status) {
    where.status = status;
  }
  if (search) {
    where[Op.or] = [
      { email: { [Op.like]: `%${search}%` } },
      { first_name: { [Op.like]: `%${search}%` } },
      { last_name: { [Op.like]: `%${search}%` } },
    ];
  }

  const include = [];
  if (role) {
    include.push({
      association: 'roles',
      required: true,
      attributes: ['id'],
      include: [{ association: 'role', where: { name: role }, attributes: ['id', 'name'] }],
    });
  }

  return await Users.findAndCountAll({
    where,
    attributes: userListAttributes(),
    include,
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  });
}

async function findUserById(userId) {
  return await Users.findOne({
    where: { id: userId },
    attributes: [...userListAttributes(), 'address', 'date_of_birth'],
  });
}

/**
 * Global roles for a page of users, in one query.
 * @returns {Map<string, string[]>} keyed by user id.
 */
async function findGlobalRolesByUserIds(userIds) {
  if (!userIds || userIds.length === 0) {
    return new Map();
  }

  const rows = await UserRoles.findAll({
    where: { user_id: { [Op.in]: userIds } },
    attributes: ['user_id'],
    include: [{ association: 'role', attributes: ['name'], required: false }],
  });

  const roles = new Map();
  for (const row of rows) {
    const name = row.role?.name;
    if (!name) {
      continue;
    }
    const key = String(row.user_id);
    const list = roles.get(key) || [];
    list.push(name);
    roles.set(key, list);
  }

  return roles;
}

async function findUserGlobalRoles(userId) {
  const rows = await UserRoles.findAll({
    where: { user_id: userId },
    attributes: ['id'],
    include: [{ association: 'role', attributes: ['id', 'name', 'description'], required: false }],
  });

  return rows.map((row) => row.role).filter(Boolean);
}

async function findUserHotelMemberships(userId) {
  return await HotelUsers.findAll({
    where: { user_id: userId },
    attributes: ['id', 'hotel_id', 'is_primary_owner', 'created_at'],
    include: [
      { association: 'hotel', attributes: ['id', 'name', 'status'], required: false },
      { association: 'role', attributes: ['id', 'name'], required: false },
    ],
  });
}

async function getBookingCountForUser(userId) {
  return await Bookings.count({ where: { buyer_id: userId } });
}

module.exports = {
  listHotels,
  findHotelById,
  findPrimaryOwnersByHotelIds,
  findHotelMembers,
  getHotelCounts,
  getHotelRating,

  listUsers,
  findUserById,
  findGlobalRolesByUserIds,
  findUserGlobalRoles,
  findUserHotelMemberships,
  getBookingCountForUser,
};
