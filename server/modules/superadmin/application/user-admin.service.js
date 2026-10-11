const ApiError = require('@utils/ApiError');

const repository = require('../infrastructure/superadmin.repository');
const { maskUser } = require('./pii');

/**
 * Platform-wide user reads for the monitoring console.
 *
 * PII (email, phone, address, date of birth) is masked unless the caller holds
 * `platform.user.pii_read` — see `options.unmaskPii`.
 */

function serializeUser(user, globalRoles, { unmaskPii = false } = {}) {
  const plain = maskUser(user, { unmask: unmaskPii });
  const fullName = `${plain.first_name || ''} ${plain.last_name || ''}`.trim();

  return {
    id: plain.id,
    email: plain.email,
    firstName: plain.first_name,
    lastName: plain.last_name,
    fullName: fullName || null,
    phoneNumber: plain.phone_number,
    status: plain.status,
    createdAt: plain.created_at,
    lastLoginAt: plain.last_login_at,
    emailVerifiedAt: plain.email_verified_at,
    globalRoles: globalRoles || [],
  };
}

async function listUsers(filters = {}, options = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);

  const result = await repository.listUsers({
    search: filters.search,
    status: filters.status,
    role: filters.role,
    limit,
    offset: (page - 1) * limit,
  });

  const roles = await repository.findGlobalRolesByUserIds(result.rows.map((user) => user.id));

  return {
    users: result.rows.map((user) =>
      serializeUser(user, roles.get(String(user.id)) || [], options)
    ),
    page,
    limit,
    total: result.count,
  };
}

async function getUser(userId, options = {}) {
  const user = await repository.findUserById(userId);

  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found.');
  }

  const [globalRoles, memberships, bookingCount] = await Promise.all([
    repository.findUserGlobalRoles(userId),
    repository.findUserHotelMemberships(userId),
    repository.getBookingCountForUser(userId),
  ]);

  const plain = maskUser(user, { unmask: options.unmaskPii });

  return {
    ...serializeUser(
      user,
      globalRoles.map((role) => role.name),
      options
    ),
    address: plain.address,
    dateOfBirth: plain.date_of_birth,
    globalRoleDetails: globalRoles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
    })),
    memberships: memberships.map((membership) => ({
      hotelId: membership.hotel_id,
      hotelName: membership.hotel?.name || null,
      hotelStatus: membership.hotel?.status || null,
      role: membership.role?.name || null,
      isPrimaryOwner: Boolean(membership.is_primary_owner),
    })),
    bookings: { total: bookingCount },
  };
}

module.exports = {
  listUsers,
  getUser,
};
