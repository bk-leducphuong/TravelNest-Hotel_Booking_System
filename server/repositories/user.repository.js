const { Users, SavedHotels, Hotels, AuthAccounts, UserRoles, Roles } = require('../models/index.js');
const { Op } = require('sequelize');

/**
 * User Repository - Contains all database operations for users
 * Only repositories may import Sequelize models
 */

class UserRepository {
  /**
   * Find user by ID
   */
  async findById(userId) {
    return await Users.findOne({
      where: { id: userId },
      attributes: [
        'id',
        'email',
        'first_name',
        'last_name',
        'phone_number',
        'address',
        'nationality',
        'country',
        'date_of_birth',
        'gender',
      ],
      include: [
        {
          model: UserRoles,
          as: 'roles',
          attributes: ['role_id'],
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
      ],
    });
  }

  /**
   * Find user by ID with password hash (for password verification)
   */
  async findByIdWithPassword(userId) {
    return await Users.findOne({
      where: { id: userId },
      attributes: ['id', 'email'],
      include: [
        {
          model: AuthAccounts,
          as: 'auth_accounts',
          required: true,
          where: {
            provider: 'local',
          },
          attributes: ['password_hash'],
        },
      ],
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    return await Users.findOne({
      where: { email },
      attributes: ['id', 'email'],
    });
  }

  /**
   * Update user field by ID
   */
  async updateById(userId, updateData) {
    return await Users.update(updateData, {
      where: { id: userId },
    });
  }

  /**
   * Find all favorite hotels for a user
   */
  async findFavoriteHotelsByUserId(userId) {
    return await SavedHotels.findAll({
      where: { user_id: userId },
      attributes: ['hotel_id'],
    });
  }

  /**
   * Find saved hotel IDs for a user within a known hotel ID list
   */
  async findFavoriteHotelIds(userId, hotelIds) {
    if (!userId || !Array.isArray(hotelIds) || hotelIds.length === 0) {
      return [];
    }

    const savedHotels = await SavedHotels.findAll({
      where: {
        user_id: userId,
        hotel_id: {
          [Op.in]: hotelIds,
        },
      },
      attributes: ['hotel_id'],
      raw: true,
    });

    return savedHotels.map((hotel) => hotel.hotel_id);
  }

  /**
   * Find favorite hotels for a user with pagination
   */
  async findFavoriteHotelsByUserIdPaginated(userId, limit, offset) {
    return await SavedHotels.findAndCountAll({
      where: { user_id: userId },
      attributes: ['hotel_id'],
      limit,
      offset,
    });
  }

  /**
   * Find hotel by ID
   */
  async findHotelById(hotelId) {
    return await Hotels.findOne({
      where: { id: hotelId },
      attributes: ['id', 'name', 'overall_rating', 'address', 'hotel_class', 'image_urls'],
    });
  }

  /**
   * Check if hotel is saved by user
   */
  async findSavedHotel(userId, hotelId) {
    return await SavedHotels.findOne({
      where: {
        hotel_id: hotelId,
        user_id: userId,
      },
    });
  }

  /**
   * Create saved hotel
   */
  async createSavedHotel(userId, hotelId) {
    return await SavedHotels.create({
      hotel_id: hotelId,
      user_id: userId,
    });
  }

  /**
   * Delete saved hotel
   */
  async deleteSavedHotel(userId, hotelId) {
    return await SavedHotels.destroy({
      where: {
        hotel_id: hotelId,
        user_id: userId,
      },
    });
  }
}

module.exports = new UserRepository();
