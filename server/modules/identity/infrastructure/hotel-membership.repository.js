const { HotelUsers } = require('@platform/database');

/**
 * Hotel membership (hotel_users) writes. Identity owns this table; onboarding
 * and admin flows assign memberships through the identity module.
 */
class HotelMembershipRepository {
  /**
   * Attach a user to a hotel with a hotel-scoped role (owner/manager/staff).
   * Idempotent: (hotel_id, user_id) is unique, so re-running updates the
   * existing membership instead of failing.
   */
  async upsertHotelRole({ userId, hotelId, roleId, isPrimaryOwner = false }, options = {}) {
    const existing = await HotelUsers.findOne({
      where: { hotel_id: hotelId, user_id: userId },
      ...options,
    });

    if (existing) {
      await existing.update(
        {
          role_id: roleId,
          is_primary_owner: isPrimaryOwner,
          updated_at: new Date(),
        },
        options
      );
      return existing;
    }

    return await HotelUsers.create(
      {
        hotel_id: hotelId,
        user_id: userId,
        role_id: roleId,
        is_primary_owner: isPrimaryOwner,
        created_at: new Date(),
        updated_at: new Date(),
      },
      options
    );
  }

  async findByHotelAndUser(userId, hotelId, options = {}) {
    return await HotelUsers.findOne({
      where: { hotel_id: hotelId, user_id: userId },
      ...options,
    });
  }

  async findPrimaryByUser(userId, options = {}) {
    return await HotelUsers.findOne({
      where: { user_id: userId, is_primary_owner: true },
      order: [['created_at', 'ASC']],
      ...options,
    });
  }
}

module.exports = new HotelMembershipRepository();
