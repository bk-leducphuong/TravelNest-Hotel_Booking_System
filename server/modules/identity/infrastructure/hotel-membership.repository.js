const { Op } = require('sequelize');

const { HotelUsers, Users, Roles } = require('@platform/database');

const USER_ATTRIBUTES = ['id', 'email', 'first_name', 'last_name'];
const ROLE_ATTRIBUTES = ['id', 'name'];

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

  /** All memberships for a hotel with user + role, for the staff table. */
  async listByHotel(hotelId, options = {}) {
    return await HotelUsers.findAll({
      where: { hotel_id: hotelId },
      include: [
        { model: Users, as: 'user', attributes: USER_ATTRIBUTES, required: false },
        { model: Roles, as: 'role', attributes: ROLE_ATTRIBUTES, required: false },
      ],
      order: [['created_at', 'ASC']],
      ...options,
    });
  }

  /** One membership with its role name (for staff update/remove). */
  async findByHotelAndUserWithRole(userId, hotelId, options = {}) {
    return await HotelUsers.findOne({
      where: { hotel_id: hotelId, user_id: userId },
      include: [{ model: Roles, as: 'role', attributes: ROLE_ATTRIBUTES, required: false }],
      ...options,
    });
  }

  async removeHotelRole(userId, hotelId, options = {}) {
    return await HotelUsers.destroy({
      where: { hotel_id: hotelId, user_id: userId },
      ...options,
    });
  }

  /** How many memberships at the hotel hold one of the given role names. */
  async countByHotelRoleNames(hotelId, roleNames, options = {}) {
    return await HotelUsers.count({
      where: { hotel_id: hotelId },
      include: [
        {
          model: Roles,
          as: 'role',
          attributes: [],
          where: { name: { [Op.in]: roleNames } },
          required: true,
        },
      ],
      distinct: true,
      ...options,
    });
  }
}

module.exports = new HotelMembershipRepository();
