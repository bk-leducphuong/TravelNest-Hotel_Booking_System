const hotelMembershipRepository = require('../../infrastructure/hotel-membership.repository');

/**
 * Members (owner/manager/staff) of a hotel, for the back-office team page.
 */
async function listHotelStaff(hotelId) {
  const memberships = await hotelMembershipRepository.listByHotel(hotelId);

  const staff = memberships.map((membership) => ({
    id: membership.id,
    userId: membership.user_id,
    hotelId: membership.hotel_id,
    role: membership.role?.name ?? null,
    isPrimaryOwner: Boolean(membership.is_primary_owner),
    email: membership.user?.email ?? null,
    firstName: membership.user?.first_name ?? null,
    lastName: membership.user?.last_name ?? null,
    createdAt: membership.created_at,
  }));

  return { staff };
}

module.exports = { listHotelStaff };
