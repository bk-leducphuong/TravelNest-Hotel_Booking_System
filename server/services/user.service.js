const bcrypt = require('bcryptjs');
const sharp = require('sharp');

const { minioClient, bucketName, getObjectUrl } = require('../config/minio.config');
const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');

/**
 * User Service - Contains main business logic
 * Follows RESTful API standards
 */

class UserService {
  /**
   * Get user information
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User information
   */
  async getUserInformation(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }
    return user;
  }

  /**
   * Update user (partial update)
   * @param {number} userId - User ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<void>}
   */
  async updateUser(userId, updateData) {
    // Validate user exists
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // If email is being updated, check for uniqueness
    if (updateData.email) {
      const existingUser = await userRepository.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        throw new ApiError(409, 'EMAIL_ALREADY_IN_USE', 'Email already in use');
      }
    }

    await userRepository.updateById(userId, updateData);
  }

  /**
   * Update user avatar
   * @param {number} userId - User ID
   * @param {Buffer} fileBuffer - Image file buffer
   * @returns {Promise<string>} Profile picture URL
   */
  async updateAvatar(userId, fileBuffer) {
    // Compress image to AVIF using sharp
    const avifBuffer = await sharp(fileBuffer).avif({ quality: 50 }).toBuffer();

    // Upload the AVIF image buffer to MinIO
    try {
      const objectName = `users/avatars/${userId}.avif`;

      await minioClient.putObject(bucketName, objectName, avifBuffer, {
        'Content-Type': 'image/avif',
      });

      const profilePictureUrl = getObjectUrl(objectName);

      await userRepository.updateById(userId, {
        profile_picture_url: profilePictureUrl,
      });

      return profilePictureUrl;
    } catch (error) {
      throw new ApiError(500, 'UPLOAD_FAILED', 'Failed to upload image to storage');
    }
  }

  /**
   * Get favorite hotels with pagination
   * @param {number} userId - User ID
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20, max: 100)
   * @returns {Promise<Object>} Hotels with pagination metadata
   */
  async getFavoriteHotels(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // Get favorite hotels with pagination
    const { count, rows: favoriteHotels } =
      await userRepository.findFavoriteHotelsByUserIdPaginated(userId, limit, offset);

    // Get hotel information for each favorite
    const hotelsWithInfo = await Promise.all(
      favoriteHotels.map(async (hotel) => {
        const hotelInformation = await userRepository.findHotelById(hotel.hotel_id);
        return {
          ...hotel.toJSON(),
          hotelInformation,
        };
      })
    );

    return {
      hotels: hotelsWithInfo,
      page,
      limit,
      total: count,
    };
  }

  /**
   * Add favorite hotel
   * @param {number} userId - User ID
   * @param {number} hotelId - Hotel ID
   * @returns {Promise<void>}
   */
  async addFavoriteHotel(userId, hotelId) {
    // Check if hotel is already saved
    const hotelIsSaved = await userRepository.findSavedHotel(userId, hotelId);
    if (hotelIsSaved) {
      throw new ApiError(409, 'HOTEL_ALREADY_FAVORITE', 'Hotel already in favorites');
    }

    await userRepository.createSavedHotel(userId, hotelId);
  }

  /**
   * Remove favorite hotel
   * @param {number} userId - User ID
   * @param {number} hotelId - Hotel ID
   * @returns {Promise<void>}
   */
  async removeFavoriteHotel(userId, hotelId) {
    await userRepository.deleteSavedHotel(userId, hotelId);
  }

  /**
   * Check if hotel is favorite
   * @param {number} userId - User ID
   * @param {number} hotelId - Hotel ID
   * @returns {Promise<boolean>}
   */
  async checkFavoriteHotel(userId, hotelId) {
    const savedHotel = await userRepository.findSavedHotel(userId, hotelId);
    return !!savedHotel;
  }

  /**
   * Reset user password
   * @param {number} userId - User ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async resetPassword(userId, oldPassword, newPassword) {
    // Get user with password hash
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      throw new ApiError(401, 'INVALID_PASSWORD', 'Old password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await userRepository.updateById(userId, {
      password_hash: hashedPassword,
    });
  }
}

module.exports = new UserService();
